#!/usr/bin/env bash
# build-orchestrator.sh — Auto-claude build pipeline
#
# Phases:
#   1. Setup & validation
#   2. Generate specs from GitHub issues
#   3. Parallel build (with retry)
#   4. Sequential merge using auto-claude's AI merge
#   5. PR creation
#
# Usage: ./build-orchestrator.sh <slug> [--parallel N] [--issue N] [--auto-merge] [--skip-pr]
#
# Resume: Run again. Issues with status=completed are skipped.

set -uo pipefail

# =============================================================================
# Configuration
# =============================================================================

SLUG=""
PARALLEL=3
SINGLE_ISSUE=""
SKIP_PR=false

AUTO_CLAUDE_DIR="lib/auto-claude/apps/backend"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(pwd)"

STATUS_DIR=".auto-claude/status"
LOGS_DIR=".auto-claude/logs"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# =============================================================================
# Argument Parsing
# =============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --parallel)   PARALLEL="$2"; shift 2 ;;
        --issue)      SINGLE_ISSUE="$2"; shift 2 ;;
        --skip-pr)    SKIP_PR=true; shift ;;
        --help|-h)
            echo "Usage: $0 <slug> [--parallel N] [--issue N] [--skip-pr]"
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"; exit 1
            ;;
        *)
            [[ -z "$SLUG" ]] && SLUG="$1"
            shift
            ;;
    esac
done

# Resolve slug from session if not provided
if [[ -z "$SLUG" && -f ".claude/session.json" ]]; then
    SLUG=$(jq -r '.current_slug // empty' .claude/session.json 2>/dev/null)
fi

if [[ -z "$SLUG" ]]; then
    echo "❌ No slug provided"
    echo "Usage: $0 <slug>"
    exit 1
fi

LABEL="prd:$SLUG"
SPECS_DIR=".auto-claude/specs/$SLUG"

# =============================================================================
# Helpers
# =============================================================================

log() {
    echo "[$(date +%H:%M:%S)] $*"
}

notify() {
    local msg="$1" emoji="${2:-🔔}"
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        bash "$SCRIPTS_DIR/slack-notify.sh" "$msg" "$emoji" &
    fi
}

is_issue_completed() {
    local num=$1
    local status_file="$STATUS_DIR/issue-$num.json"
    [[ -f "$status_file" ]] && [[ $(jq -r '.status' "$status_file" 2>/dev/null) == "completed" ]]
}

get_repo_name() {
    git remote get-url origin 2>/dev/null | sed -E 's/.*[:/]([^/]+)\/([^/.]+)(\.git)?$/\2/'
}

get_repo_full() {
    git remote get-url origin 2>/dev/null | sed -E 's/.*[:/]([^/]+\/[^/.]+)(\.git)?$/\1/'
}

# Filter auto-claude output to show only milestones in stdout
# Full output always goes to the log file to preserve debugging capability
# This prevents context overflow in the orchestrating Claude Code session
filter_milestones() {
    local LOG_FILE="$1"
    local ISSUE_NUM="$2"

    # Patterns indicating meaningful milestones worth showing to user
    local MILESTONE_PATTERN='SESSION [0-9]+:|Progress:.*\[|BUILD COMPLETE|BUILD PAUSED|Phase.*complete|Subtask.*completed|✅|❌|⚠️|Error:|error:|BLOCKED|QA VALIDATION|PLANNER|CODER|QA'

    while IFS= read -r line; do
        # Always write full output to log file
        echo "$line" >> "$LOG_FILE"

        # Only print milestones to stdout (prefixed with issue number)
        if echo "$line" | grep -qE "$MILESTONE_PATTERN"; then
            echo "[#$ISSUE_NUM] $line"
        fi
    done
}

# =============================================================================
# Phase 1: Prerequisites
# =============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔍 Phase 1: Prerequisites"
echo "═══════════════════════════════════════════════════════════════"

ERRORS=()

# Switch to feature branch if session exists
if [[ -f ".claude/session.json" ]]; then
    EXPECTED=$(jq -r '.branch // empty' .claude/session.json 2>/dev/null)
    CURRENT=$(git branch --show-current)
    if [[ -n "$EXPECTED" && "$CURRENT" != "$EXPECTED" ]]; then
        echo "⚠️  Switching to $EXPECTED"
        git checkout "$EXPECTED"
    fi
fi
FEATURE_BRANCH=$(git branch --show-current)
echo "✓ Branch: $FEATURE_BRANCH (baseBranch for worktrees)"

# Validate requirements
PRD_FILE="docs/prd/$SLUG.md"
[[ -f "$PRD_FILE" ]]                           && echo "✓ PRD: $PRD_FILE" || ERRORS+=("PRD not found: $PRD_FILE")
[[ -d "$AUTO_CLAUDE_DIR" ]]                    && echo "✓ auto-claude" || ERRORS+=("auto-claude missing at $AUTO_CLAUDE_DIR")
[[ -f "$AUTO_CLAUDE_DIR/.venv/bin/activate" ]] && echo "✓ venv" || ERRORS+=("venv missing - run: cd $AUTO_CLAUDE_DIR && uv venv && uv pip install -r requirements.txt")
[[ -f "$SCRIPTS_DIR/issue-to-spec.py" ]]       && echo "✓ issue-to-spec.py" || ERRORS+=("issue-to-spec.py missing")
gh auth status &>/dev/null                     && echo "✓ gh auth" || ERRORS+=("gh not authenticated")

# OAuth token for auto-claude
if [[ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" && -f "$HOME/.claude/.credentials.json" ]]; then
    export CLAUDE_CODE_OAUTH_TOKEN=$(jq -r '.claudeAiOauth.accessToken' "$HOME/.claude/.credentials.json" 2>/dev/null)
fi
[[ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]] && echo "✓ OAuth token" || ERRORS+=("OAuth token missing - run: claude login")

if [[ ${#ERRORS[@]} -gt 0 ]]; then
    echo ""
    echo "❌ Prerequisites failed:"
    printf '   • %s\n' "${ERRORS[@]}"
    exit 1
fi

# Update session phase to "building"
if [[ -f ".claude/session.json" ]]; then
    BRANCH_NAME=$(jq -r '.branch // empty' .claude/session.json 2>/dev/null)
    cat > .claude/session.json << EOF
{
    "current_slug": "$SLUG",
    "branch": "$BRANCH_NAME",
    "phase": "building",
    "updated_at": "$(date -Iseconds)"
}
EOF
fi

# =============================================================================
# Phase 2: Fetch Issues
# =============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📋 Phase 2: Fetch Issues"
echo "═══════════════════════════════════════════════════════════════"

mkdir -p "$STATUS_DIR" "$SPECS_DIR" "$LOGS_DIR"

if [[ -n "$SINGLE_ISSUE" ]]; then
    ALL_ISSUES=("$SINGLE_ISSUE")
else
    mapfile -t ALL_ISSUES < <(gh issue list --label "$LABEL" --state open --json number -q '.[].number' | sort -n)
fi

if [[ ${#ALL_ISSUES[@]} -eq 0 ]]; then
    echo "No open issues with label: $LABEL"
    echo "Run /breakdown first to create issues."
    exit 0
fi

# Filter: skip locally completed issues (resume support)
PENDING_ISSUES=()
for n in "${ALL_ISSUES[@]}"; do
    if is_issue_completed "$n"; then
        echo "  ⏭️  #$n (already completed)"
    else
        PENDING_ISSUES+=("$n")
        TITLE=$(gh issue view "$n" --json title -q '.title' 2>/dev/null || echo "Unknown")
        echo "  📌 #$n: $TITLE"
    fi
done

echo ""
if [[ ${#PENDING_ISSUES[@]} -eq 0 ]]; then
    echo "✅ All issues already completed locally."
    SKIP_BUILD=true
else
    echo "Pending: ${#PENDING_ISSUES[@]} issue(s)"
    echo "Parallel: $PARALLEL concurrent builds"
    SKIP_BUILD=false
fi

# =============================================================================
# Phase 3: Generate Specs
# =============================================================================

if [[ "$SKIP_BUILD" != true ]]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "📝 Phase 3: Generate Specs"
    echo "═══════════════════════════════════════════════════════════════"

    PRD_ARG=""
    [[ -f "$PRD_FILE" ]] && PRD_ARG="--prd $PRD_FILE"

    # Get full repo name (owner/repo) to pass explicitly to issue-to-spec.py
    # This prevents gh CLI from using submodule context when run from AUTO_CLAUDE_DIR
    GH_REPO=$(get_repo_full)
    echo "Repository: $GH_REPO"

    for n in "${PENDING_ISSUES[@]}"; do
        # Generate spec using venv Python to get spec_id with description
        echo "  → #$n"
        cd "$PROJECT_ROOT/$AUTO_CLAUDE_DIR"
        source .venv/bin/activate

        # First generate to temp location to get spec_id
        TEMP_SPEC_DIR="$PROJECT_ROOT/$SPECS_DIR/.temp-$n"
        python "$SCRIPTS_DIR/issue-to-spec.py" --issue "$n" --output "$TEMP_SPEC_DIR" --repo "$GH_REPO" $PRD_ARG

        # Read the generated spec_id from implementation_plan.json
        SPEC_ID=$(jq -r '.spec_id' "$TEMP_SPEC_DIR/implementation_plan.json")
        SPEC_DIR="$PROJECT_ROOT/$SPECS_DIR/$SPEC_ID"

        # Move to final location with proper naming
        if [[ -d "$SPEC_DIR" ]]; then
            echo "  ⏭️  #$n (spec exists at $SPEC_ID)"
            rm -rf "$TEMP_SPEC_DIR"
        else
            mv "$TEMP_SPEC_DIR" "$SPEC_DIR"
            echo "  ✅ #$n → $SPEC_ID"
        fi

        cd "$PROJECT_ROOT"
    done
fi

# =============================================================================
# Phase 4: Parallel Build (with retry)
# =============================================================================

if [[ "$SKIP_BUILD" != true ]]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "🚀 Phase 4: Build (parallel: $PARALLEL)"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Logs: tail -f $LOGS_DIR/build-*-$TIMESTAMP.log"
    echo ""

    notify "Build started: $SLUG (${#PENDING_ISSUES[@]} issues)" "🚀"

    # Tier 1 validation: Verify auto-claude actually performed work
    # Called after exit code 0 to catch false positives (no-op builds)
    validate_build_completion() {
        local SPEC_ID=$1
        local WORKTREE_PATH="$PROJECT_ROOT/.worktrees/$SPEC_ID"

        # Check 1: Worktree directory exists
        if [[ ! -d "$WORKTREE_PATH" ]]; then
            echo "Validation failed: Worktree not found at $WORKTREE_PATH" >&2
            return 1
        fi

        # Check 2: Branch exists
        if ! git rev-parse --verify "auto-claude/$SPEC_ID" &>/dev/null; then
            echo "Validation failed: Branch auto-claude/$SPEC_ID not found" >&2
            return 1
        fi

        # Check 3: Has commits (using git -C for safety, no cd required)
        local COMMIT_COUNT
        COMMIT_COUNT=$(git -C "$WORKTREE_PATH" rev-list --count "$FEATURE_BRANCH..HEAD" 2>/dev/null || echo "0")
        if [[ "$COMMIT_COUNT" -eq 0 ]]; then
            echo "Validation failed: No commits (0 ahead of $FEATURE_BRANCH)" >&2
            return 1
        fi

        # Check 4: Has file changes
        local CHANGES
        CHANGES=$(git -C "$WORKTREE_PATH" diff --shortstat "$FEATURE_BRANCH...HEAD" 2>/dev/null)
        if [[ -z "$CHANGES" ]]; then
            echo "Validation failed: No file changes detected" >&2
            return 1
        fi

        # All checks passed
        echo "Build validated: $COMMIT_COUNT commits, $CHANGES" >&2
        return 0
    }

    # Build function (runs in subshell)
    run_build() {
        local NUM=$1
        local ATTEMPT=${2:-1}
        # Find spec directory by issue number (may be named 001-description or just 001)
        local SPEC_DIR=$(find "$SPECS_DIR" -maxdepth 1 -type d -name "$(printf '%03d' "$NUM")*" | head -1)
        local SPEC_ID=$(jq -r '.spec_id' "$SPEC_DIR/implementation_plan.json")
        local LOG="$LOGS_DIR/build-$NUM-$TIMESTAMP.log"
        local STATUS_FILE="$STATUS_DIR/issue-$NUM.json"

        # Initialize status
        cat > "$STATUS_FILE" << EOF
{
    "issue": $NUM,
    "spec_id": "$SPEC_ID",
    "status": "running",
    "attempt": $ATTEMPT,
    "started_at": "$(date -Iseconds)",
    "last_activity": "$(date -Iseconds)"
}
EOF

        log "Starting #$NUM (attempt $ATTEMPT)"
        echo "[$(date +%H:%M:%S)] Starting #$NUM (attempt $ATTEMPT)" >> "$LOG"

        # Change to auto-claude directory and activate venv
        cd "$PROJECT_ROOT/$AUTO_CLAUDE_DIR"
        source .venv/bin/activate

        # Run auto-claude
        # NOTE: Worktree isolation is DEFAULT behavior - no --isolated flag needed
        # Auto-claude creates worktree at .worktrees/{spec-id}/
        # baseBranch is captured as current branch (FEATURE_BRANCH)
        # Output filtered to milestones only (full logs in $LOG)
        if python run.py \
            --spec "$SPEC_ID" \
            --project-dir "$PROJECT_ROOT" \
            --max-iterations 30 \
            --force \
            --auto-continue \
            2>&1 | filter_milestones "$LOG" "$NUM"; then

            # Exit code 0 - validate actual completion
            if validate_build_completion "$SPEC_ID"; then
                # Validation passed - true success
                cat > "$STATUS_FILE" << EOF
{
    "issue": $NUM,
    "spec_id": "$SPEC_ID",
    "status": "completed",
    "attempt": $ATTEMPT,
    "completed_at": "$(date -Iseconds)"
}
EOF
                log "✅ #$NUM completed"
                echo "[$(date +%H:%M:%S)] ✅ #$NUM completed" >> "$LOG"
                return 0
            else
                # Validation failed despite exit 0
                cat > "$STATUS_FILE" << EOF
{
    "issue": $NUM,
    "spec_id": "$SPEC_ID",
    "status": "failed",
    "attempt": $ATTEMPT,
    "failed_at": "$(date -Iseconds)",
    "validation_failed": true
}
EOF
                log "❌ #$NUM validation failed (exit 0 but no work done)"
                echo "[$(date +%H:%M:%S)] ❌ #$NUM validation failed" >> "$LOG"
                return 1
            fi
        else
            # Failed
            cat > "$STATUS_FILE" << EOF
{
    "issue": $NUM,
    "spec_id": "$SPEC_ID",
    "status": "failed",
    "attempt": $ATTEMPT,
    "failed_at": "$(date -Iseconds)"
}
EOF
            log "❌ #$NUM failed (attempt $ATTEMPT)"
            echo "[$(date +%H:%M:%S)] ❌ #$NUM failed (attempt $ATTEMPT)" >> "$LOG"
            return 1
        fi
    }

    # Export for subshells
    export -f run_build log filter_milestones validate_build_completion
    export SPECS_DIR STATUS_DIR LOGS_DIR TIMESTAMP PROJECT_ROOT AUTO_CLAUDE_DIR FEATURE_BRANCH CLAUDE_CODE_OAUTH_TOKEN

    # Parallel execution with semaphore
    declare -A PIDS
    RUNNING=0

    for n in "${PENDING_ISSUES[@]}"; do
        # Wait if at parallel limit
        while [[ $RUNNING -ge $PARALLEL ]]; do
            for p in "${!PIDS[@]}"; do
                if ! kill -0 "$p" 2>/dev/null; then
                    wait "$p" || true
                    unset "PIDS[$p]"
                    ((RUNNING--))
                fi
            done
            sleep 2
        done

        # Start build in background
        run_build "$n" 1 &
        PIDS[$!]=$n
        ((RUNNING++))
        echo "  Launched #$n (PID: $!)"
    done

    # Wait for all builds
    echo ""
    echo "⏳ Waiting for builds..."
    for p in "${!PIDS[@]}"; do
        wait "$p" || true
    done

    # Retry failed builds once
    echo ""
    echo "Checking for failures to retry..."
    RETRY_ISSUES=()
    for n in "${PENDING_ISSUES[@]}"; do
        STATUS=$(jq -r '.status' "$STATUS_DIR/issue-$n.json" 2>/dev/null || echo "unknown")
        ATTEMPT=$(jq -r '.attempt // 1' "$STATUS_DIR/issue-$n.json" 2>/dev/null || echo "1")
        if [[ "$STATUS" == "failed" && "$ATTEMPT" -eq 1 ]]; then
            RETRY_ISSUES+=("$n")
        fi
    done

    if [[ ${#RETRY_ISSUES[@]} -gt 0 ]]; then
        echo ""
        echo "🔄 Retrying ${#RETRY_ISSUES[@]} failed issue(s)..."
        for n in "${RETRY_ISSUES[@]}"; do
            echo "  → Retrying #$n"
            run_build "$n" 2
        done
    fi
fi

# =============================================================================
# Phase 5: Results Summary
# =============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📊 Build Results"
echo "═══════════════════════════════════════════════════════════════"

COMPLETED_ISSUES=()
FAILED_ISSUES=()

for n in "${ALL_ISSUES[@]}"; do
    STATUS=$(jq -r '.status' "$STATUS_DIR/issue-$n.json" 2>/dev/null || echo "unknown")
    case $STATUS in
        completed)
            COMPLETED_ISSUES+=("$n")
            echo "  ✅ #$n"
            ;;
        failed)
            FAILED_ISSUES+=("$n")
            echo "  ❌ #$n (see: $LOGS_DIR/build-$n-$TIMESTAMP.log)"
            ;;
        *)
            echo "  ⚠️  #$n ($STATUS)"
            ;;
    esac
done

echo ""
echo "  Completed: ${#COMPLETED_ISSUES[@]} / ${#ALL_ISSUES[@]}"
[[ ${#FAILED_ISSUES[@]} -gt 0 ]] && echo "  Failed:    ${#FAILED_ISSUES[@]}"

# =============================================================================
# Phase 6: Sequential Merge (using auto-claude's AI merge)
# =============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔀 Phase 6: Merge Worktrees → Feature Branch"
echo "═══════════════════════════════════════════════════════════════"

MERGED_COUNT=0
MERGE_FAILED=()

cd "$PROJECT_ROOT/$AUTO_CLAUDE_DIR"
source .venv/bin/activate

for n in "${COMPLETED_ISSUES[@]}"; do
    # Find spec directory by issue number (may be named 001-description or just 001)
    SPEC_DIR=$(find "$PROJECT_ROOT/$SPECS_DIR" -maxdepth 1 -type d -name "$(printf '%03d' "$n")*" | head -1)
    SPEC_ID=$(jq -r '.spec_id' "$SPEC_DIR/implementation_plan.json" 2>/dev/null)
    MERGE_LOG="$PROJECT_ROOT/$LOGS_DIR/merge-$n-$TIMESTAMP.log"

    echo "  → #$n: merging spec $SPEC_ID"

    # Use auto-claude's --merge which has three-tier AI conflict resolution:
    # 1. Git auto-merge (simple cases)
    # 2. AI resolves conflict regions
    # 3. Full-file AI fallback
    # Output filtered to milestones only (full logs in $MERGE_LOG)
    if python run.py --spec "$SPEC_ID" --project-dir "$PROJECT_ROOT" --merge --force --auto-continue 2>&1 | filter_milestones "$MERGE_LOG" "$n"; then
        echo "  ✅ #$n merged"
        ((MERGED_COUNT++))

        # Clean up worktree after successful merge
        python run.py --spec "$SPEC_ID" --project-dir "$PROJECT_ROOT" --discard --auto-continue 2>/dev/null || true
    else
        echo "  ❌ #$n merge FAILED (AI couldn't resolve, see: $MERGE_LOG)"
        MERGE_FAILED+=("$n:$SPEC_ID")

        # Discard the failed worktree to clean up
        python run.py --spec "$SPEC_ID" --project-dir "$PROJECT_ROOT" --discard --auto-continue 2>/dev/null || true
    fi
done

# Discard worktrees for failed builds
for n in "${FAILED_ISSUES[@]}"; do
    # Find spec directory by issue number (may be named 001-description or just 001)
    SPEC_DIR=$(find "$PROJECT_ROOT/$SPECS_DIR" -maxdepth 1 -type d -name "$(printf '%03d' "$n")*" | head -1)
    SPEC_ID=$(jq -r '.spec_id' "$SPEC_DIR/implementation_plan.json" 2>/dev/null)
    echo "  🗑️  #$n: discarding failed build"
    python run.py --spec "$SPEC_ID" --project-dir "$PROJECT_ROOT" --discard --auto-continue 2>/dev/null || true
done

cd "$PROJECT_ROOT"

echo ""
echo "  Merged: $MERGED_COUNT"
[[ ${#MERGE_FAILED[@]} -gt 0 ]] && echo "  Merge failures: ${#MERGE_FAILED[@]}"

# =============================================================================
# Phase 7: PR Creation
# =============================================================================

# Determine final status
HAS_MERGE_FAILURES=false
[[ ${#MERGE_FAILED[@]} -gt 0 ]] && HAS_MERGE_FAILURES=true

ALL_BUILDS_OK=true
[[ ${#FAILED_ISSUES[@]} -gt 0 ]] && ALL_BUILDS_OK=false

if [[ "$HAS_MERGE_FAILURES" == true ]]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "⚠️  MERGE FAILURES — Manual Resolution Required"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "The following issues could not be merged even with AI assistance:"
    for entry in "${MERGE_FAILED[@]}"; do
        IFS=':' read -r ISSUE_NUM SPEC_ID <<< "$entry"
        echo "  • #$ISSUE_NUM (spec: $SPEC_ID)"
    done
    echo ""
    echo "To resolve manually:"
    echo "  1. Check worktree: .worktrees/auto-claude/{spec-id}/"
    echo "  2. Merge manually: git merge auto-claude/{spec-id}"
    echo "  3. Resolve conflicts, commit"
    echo "  4. Run /build again"
    echo ""
    echo "No PR created due to merge failures."
    
    notify "Build $SLUG: merge failures - manual intervention needed" "⚠️"
    exit 2

elif [[ "$SKIP_PR" == true ]]; then
    echo ""
    echo "Skipping PR (--skip-pr)"
    notify "Build $SLUG completed (PR skipped)" "✅"

elif [[ "$ALL_BUILDS_OK" != true ]]; then
    echo ""
    echo "⚠️  Skipping PR — not all issues completed"
    echo "   Run again to retry failed issues, or use --issue N"
    notify "Build $SLUG: ${#COMPLETED_ISSUES[@]}/${#ALL_ISSUES[@]} completed, ${#FAILED_ISSUES[@]} failed" "⚠️"
    exit 1

else
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "📤 Phase 7: Create PR"
    echo "═══════════════════════════════════════════════════════════════"

    # Commit any uncommitted changes (shouldn't be any, but safety)
    if [[ -n $(git status --porcelain) ]]; then
        git add -A
        git commit -m "build($SLUG): auto-claude implementation"
    fi

    # Push feature branch
    git push -u origin "$FEATURE_BRANCH"

    # Determine PR prefix
    PREFIX="feat"
    [[ "$FEATURE_BRANCH" =~ ^fix/ ]] && PREFIX="fix"

    # Build issue list for PR body
    ISSUES_MD=""
    for n in "${ALL_ISSUES[@]}"; do
        TITLE=$(gh issue view "$n" --json title -q '.title' 2>/dev/null || echo "Unknown")
        ISSUES_MD+="- #$n: $TITLE"$'\n'
    done

    # Get repo name for preview URL
    REPO_NAME=$(get_repo_name)
    PREVIEW_URL="https://${REPO_NAME}-preview.tob.sh"

    # Create PR
    PR_URL=$(gh pr create \
        --title "${PREFIX}(${SLUG}): Implementation" \
        --body "## PRD
\`docs/prd/${SLUG}.md\`

## Issues Implemented
$ISSUES_MD
## Preview
🔗 $PREVIEW_URL

---
*Generated by /build-auto-claude*" \
        --base main \
        --head "$FEATURE_BRANCH")

    PR_NUM=$(echo "$PR_URL" | grep -oE '[0-9]+$')
    
    echo ""
    echo "✅ PR created: $PR_URL"
    echo "🔗 Preview:    $PREVIEW_URL"

    # Update session
    mkdir -p .claude
    cat > .claude/session.json << EOF
{
    "current_slug": "$SLUG",
    "branch": "$FEATURE_BRANCH",
    "phase": "pr-created",
    "pr_number": $PR_NUM,
    "pr_url": "$PR_URL",
    "preview_url": "$PREVIEW_URL",
    "updated_at": "$(date -Iseconds)"
}
EOF

    notify "Build $SLUG complete! PR: $PR_URL | Preview: $PREVIEW_URL" "✅"
fi

# =============================================================================
# Done
# =============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════════"
if [[ "$HAS_MERGE_FAILURES" == true ]]; then
    echo "⚠️  Done with merge failures - exit code 2"
    exit 2
elif [[ "$ALL_BUILDS_OK" == true ]]; then
    echo "✅ Done: $SLUG"
    exit 0
else
    echo "⚠️  Done with build failures - run again to retry"
    exit 1
fi
