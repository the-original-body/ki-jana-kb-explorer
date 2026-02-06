---
description: Implement GitHub Issues via native Claude agents in parallel worktrees. Called by /build --manual.
model: claude-opus-4-5
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, TaskOutput
argument-hint: [app-name-slug] [--issue N]
---

ultrathink

# /build-manual - Native Agent Implementation Engine

## Overview
Implements GitHub Issues using native Claude agents. Each issue runs in an isolated git worktree with a dedicated agent. After all agents complete, the main agent merges branches, verifies integration, and creates a PR.

## Phase 0: Resolve Slug & Parse Arguments

**Rule: Explicit slug argument OR session.json. No other options.**

```bash
SLUG=""
SINGLE_ISSUE=""

# Simple argument parsing
for arg in $ARGUMENTS; do
  case $arg in
    --issue)
      NEXT_IS_ISSUE=1
      ;;
    *)
      if [[ -n "$NEXT_IS_ISSUE" ]]; then
        SINGLE_ISSUE="$arg"
        unset NEXT_IS_ISSUE
      elif [[ -z "$SLUG" && ! "$arg" =~ ^-- ]]; then
        SLUG="$arg"
      fi
      ;;
  esac
done

# If no explicit slug, try session.json
if [[ -z "$SLUG" ]]; then
  if [[ -f ".claude/session.json" ]]; then
    SLUG=$(jq -r '.current_slug // empty' .claude/session.json)
    if [[ -z "$SLUG" ]]; then
      echo "No slug in session.json and no argument provided."
      echo "Usage: /build <app-name-slug> [--issue N]"
      exit 1
    fi
    echo "Using slug from session: $SLUG"
  else
    echo "No slug provided and no session.json found."
    echo "Usage: /build <app-name-slug> [--issue N]"
    exit 1
  fi
fi
```

**Store for later phases:**
- `SLUG` - The PRD slug
- `SINGLE_ISSUE` - Optional single issue number

## Phase 1: Validate Prerequisites

```bash
# Verify PRD exists
if [[ ! -f "docs/prd/$SLUG.md" ]]; then
  echo "PRD not found: docs/prd/$SLUG.md"
  echo "Run /design $SLUG first."
  exit 1
fi

# Verify batch manifest exists
if [[ ! -f ".claude/batches/$SLUG.json" ]]; then
  echo "Batch manifest not found: .claude/batches/$SLUG.json"
  echo "Run /breakdown $SLUG first."
  exit 1
fi

# Verify clean git state
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working directory not clean. Please commit or stash changes first."
  git status --short
  exit 1
fi

# Get base branch
BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")
echo "Base branch: $BASE_BRANCH"
```

## Phase 2: Fetch Issues & Display Plan

```bash
LABEL="prd:$SLUG"
echo ""
echo "============================================================"
echo "Build: $SLUG"
echo "============================================================"
echo ""

if [[ -n "$SINGLE_ISSUE" ]]; then
  echo "Mode: Single issue (#$SINGLE_ISSUE)"
  ISSUES=$(gh issue view "$SINGLE_ISSUE" --json number,title,body | jq -s '.')
else
  echo "Mode: All open issues"
  ISSUES=$(gh issue list --label "$LABEL" --state open --json number,title,body --limit 50)
fi

ISSUE_COUNT=$(echo "$ISSUES" | jq length)
echo "Issues to implement: $ISSUE_COUNT"
echo ""

# Display issues
echo "$ISSUES" | jq -r '.[] | "  #\(.number): \(.title)"'
echo ""
```

**If ISSUE_COUNT is 0, exit with error directing user to /breakdown.**

## Phase 3: Create Worktrees

For each issue, create a dedicated worktree:

```bash
WORKTREE_BASE=".worktrees/$SLUG"
mkdir -p "$WORKTREE_BASE"

# Create worktrees for each issue
echo "$ISSUES" | jq -c '.[]' | while read -r ISSUE; do
  NUMBER=$(echo "$ISSUE" | jq -r '.number')
  BRANCH="build/$SLUG/issue-$NUMBER"
  WORKTREE="$WORKTREE_BASE/issue-$NUMBER"

  # Create branch from base
  git branch "$BRANCH" "$BASE_BRANCH" 2>/dev/null || true

  # Create worktree
  if [[ ! -d "$WORKTREE" ]]; then
    git worktree add "$WORKTREE" "$BRANCH"
    echo "Created worktree: $WORKTREE"
  else
    echo "Worktree exists: $WORKTREE"
  fi
done
```

## Phase 4: Spawn Parallel Agents

**CRITICAL: Use Task tool to spawn ALL agents in a SINGLE message for parallel execution.**

Read the PRD content first:
```bash
PRD_CONTENT=$(cat "docs/prd/$SLUG.md")
```

For EACH issue, spawn an agent with the Task tool using `subagent_type: "general-purpose"`:

**Agent Prompt Template:**
```
Implement GitHub Issue #$NUMBER in the worktree.

## Working Directory
$PROJECT_ROOT/.worktrees/$SLUG/issue-$NUMBER

## Issue Details
Title: $TITLE

$BODY

## Context from PRD
$PRD_CONTENT

## Instructions
1. Change to the worktree directory
2. Read the existing codebase to understand the structure
3. Implement the issue requirements
4. Run verification: npm run typecheck && npm run lint && npm test
5. If verification passes, create a commit:
   git add -A
   git commit -m "feat: implement issue #$NUMBER - $TITLE"
6. Report:
   - SUCCESS: List files changed and summary
   - FAILURE: Describe what failed and why

## Constraints
- Do NOT push to remote
- Do NOT merge branches
- Do NOT modify files outside the worktree
- If requirements are unclear, report FAILURE with specific questions
```

**Wait for ALL agents to complete using TaskOutput.**

## Phase 5: Merge Worktrees

After all agents complete:

```bash
# Create integration branch
INTEGRATION_BRANCH="build/$SLUG/integration"
git checkout -b "$INTEGRATION_BRANCH" "$BASE_BRANCH"

# Merge each issue branch
echo "$ISSUES" | jq -r '.number' | while read -r NUMBER; do
  BRANCH="build/$SLUG/issue-$NUMBER"
  echo "Merging $BRANCH..."

  if ! git merge "$BRANCH" --no-edit; then
    echo "Merge conflict detected for issue #$NUMBER"
    # Use AI to resolve conflicts
    # ... spawn conflict resolution agent if needed
  fi
done
```

**If merge conflicts occur:** Use Task tool to spawn a conflict resolution agent that:
1. Reads the conflicted files
2. Understands both changes
3. Resolves conflicts intelligently
4. Stages the resolution

## Phase 6: Integration Verification

**The main agent now verifies the merged state works:**

```bash
echo ""
echo "============================================================"
echo "Integration Verification"
echo "============================================================"
echo ""

npm run typecheck && npm run lint && npm test && npm run build
```

**If any checks fail:**
1. Analyze the failures (type errors, lint issues, test failures, build errors)
2. Fix integration issues (imports, type mismatches, conflicting changes)
3. Re-run checks until passing
4. Create integration commit:
   ```bash
   git add -A
   git commit -m "fix: resolve integration issues for $SLUG"
   ```

**Report what was fixed.**

## Phase 7: Push & Create PR

```bash
echo ""
echo "============================================================"
echo "Creating Pull Request"
echo "============================================================"
echo ""

# Push integration branch
git push -u origin "$INTEGRATION_BRANCH"

# Build issue list for PR body
ISSUE_LIST=$(echo "$ISSUES" | jq -r '.[] | "- #\(.number): \(.title)"')

# Create PR
gh pr create \
  --title "feat($SLUG): Implement PRD issues" \
  --body "$(cat <<EOF
## Summary

Implements all issues from PRD: \`docs/prd/$SLUG.md\`

## Issues Implemented

$ISSUE_LIST

## Verification

- [x] TypeScript compiles
- [x] Linting passes
- [x] Tests pass
- [x] Build succeeds

---
Generated by /build
EOF
)" \
  --base "$BASE_BRANCH" \
  --head "$INTEGRATION_BRANCH"
```

**Capture and display the PR URL.**

## Phase 8: Cleanup

```bash
echo ""
echo "Cleaning up worktrees..."

# Remove worktrees
echo "$ISSUES" | jq -r '.number' | while read -r NUMBER; do
  WORKTREE="$WORKTREE_BASE/issue-$NUMBER"
  BRANCH="build/$SLUG/issue-$NUMBER"

  git worktree remove "$WORKTREE" --force 2>/dev/null || true
  git branch -D "$BRANCH" 2>/dev/null || true
done

rmdir "$WORKTREE_BASE" 2>/dev/null || true
rmdir ".worktrees" 2>/dev/null || true

echo "Cleanup complete."
```

## Phase 9: Final Output

```
============================================================
Build Complete
============================================================

PR Created: $PR_URL

Please review the PR and merge when ready.

Next steps:
1. Review the PR: gh pr view $PR_NUMBER --web
2. Merge when approved: gh pr merge $PR_NUMBER --squash
```

**Update session.json:**
```bash
cat > .claude/session.json << EOF
{
  "current_slug": "$SLUG",
  "phase": "pr-created",
  "pr_url": "$PR_URL",
  "updated_at": "$(date -Iseconds)"
}
EOF
```

## Usage Examples

```bash
# Build all issues from current session
/build

# Build all issues from specific PRD
/build user-auth

# Build single issue (for debugging/priority)
/build --issue 42

# Build single issue from specific PRD
/build user-auth --issue 42
```

## Error Handling

| Error | Action |
|-------|--------|
| No slug (arg or session) | Show usage, exit |
| PRD not found | Direct to /design |
| No issues found | Direct to /breakdown |
| Uncommitted changes | Ask user to commit/stash |
| Worktree creation fails | Report error, skip issue |
| Agent implementation fails | Continue with others, report at end |
| Merge conflict | Use AI to resolve |
| Integration issues | Main agent fixes and re-runs tests |
| Tests won't pass after fixes | Report failures, ask user to intervene |
| PR creation fails | Report error, show manual command |

## Constraints

- **No Design Decisions:** /build implements, it doesn't decide WHAT to build.
  If an issue is ambiguous, agent should fail with a clear error.

- **Scope Isolation:** Only builds issues with label `prd:<slug>`.

- **Parallel Execution:** All issue agents run simultaneously for speed.

- **Integration Guarantee:** Main agent ensures merged code compiles, lints, tests, and builds before creating PR.

- **Auto-Cleanup:** Worktrees and branches are removed after PR creation.
