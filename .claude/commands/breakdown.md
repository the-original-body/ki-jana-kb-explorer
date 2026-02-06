---
description: Atomize PRD into INVEST-compliant GitHub Issues. Creates scoped batch for /build.
model: claude-opus-4-5
allowed-tools: Read, Write, Bash, Glob
argument-hint: [app-name-slug]
---

ultrathink

# /breakdown - PRD to GitHub Issues

## Phase 0: Resolve Slug & Verify Branch

**Rule: Explicit argument OR session.json. No other options.**

```bash
# Check for explicit argument
if [[ -n "$ARGUMENTS" ]]; then
  SLUG="$ARGUMENTS"
# Fallback to session.json
elif [[ -f ".claude/session.json" ]]; then
  SLUG=$(jq -r '.current_slug // empty' .claude/session.json)
  if [[ -z "$SLUG" ]]; then
    echo "❌ No slug in session.json and no argument provided."
    echo "Usage: /breakdown <app-name-slug>"
    exit 1
  fi
  echo "📍 Using slug from session: $SLUG"
else
  echo "❌ No slug provided and no session.json found."
  echo "Usage: /breakdown <app-name-slug>"
  exit 1
fi

# Verify we're on the correct feature branch
if [[ -f ".claude/session.json" ]]; then
  EXPECTED_BRANCH=$(jq -r '.branch // empty' .claude/session.json)
  CURRENT_BRANCH=$(git branch --show-current)

  if [[ -n "$EXPECTED_BRANCH" && "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]]; then
    echo "⚠️  Not on expected branch: $EXPECTED_BRANCH"
    echo "   Currently on: $CURRENT_BRANCH"
    echo ""
    echo "Switching to feature branch..."
    git checkout "$EXPECTED_BRANCH"
  fi
fi
```

## Phase 0.5: Detect Source Document Type

**Determine if we're creating epic issues or story issues.**

```bash
# Check for technical plan (epic mode)
if [[ -f "docs/technical-plan.md" ]]; then
  SOURCE="technical-plan"
  DOC_PATH="docs/technical-plan.md"
  echo "📋 Found technical plan - creating EPIC issues"
# Check for legacy PRD (story mode)
elif [[ -f "docs/prd/$SLUG.md" ]]; then
  SOURCE="prd"
  DOC_PATH="docs/prd/$SLUG.md"
  echo "📋 Found PRD - creating story issues"
else
  echo "❌ No design document found"
  echo "Expected: docs/technical-plan.md OR docs/prd/$SLUG.md"
  echo "Run /design first."
  exit 1
fi
```

## Phase 1: Initialize Labels & Validate Document

**Step 0: Ensure Required Labels Exist**

```bash
echo "🏷️  Ensuring required labels exist..."

# Core workflow label
gh label create "tide" \
  --description "TIDE workflow marker" \
  --color "7057ff" \
  --force 2>/dev/null || true

# Type labels
gh label create "type:feat" \
  --description "New feature" \
  --color "00ff00" \
  --force 2>/dev/null || true

gh label create "type:fix" \
  --description "Bug fix" \
  --color "ff0000" \
  --force 2>/dev/null || true

gh label create "type:refactor" \
  --description "Code refactoring" \
  --color "0000ff" \
  --force 2>/dev/null || true

gh label create "type:docs" \
  --description "Documentation" \
  --color "808080" \
  --force 2>/dev/null || true

gh label create "type:test" \
  --description "Test-related work" \
  --color "800080" \
  --force 2>/dev/null || true

# Priority labels
gh label create "priority:high" \
  --description "Critical/blocking work" \
  --color "d73a4a" \
  --force 2>/dev/null || true

gh label create "priority:medium" \
  --description "Important but not blocking" \
  --color "ff9800" \
  --force 2>/dev/null || true

gh label create "priority:low" \
  --description "Nice to have" \
  --color "d4d4d4" \
  --force 2>/dev/null || true

# PRD-specific scope label
gh label create "prd:$SLUG" \
  --description "Issues from PRD: $SLUG" \
  --color "0366d6" \
  --force 2>/dev/null || true

# Scope labels (for epic vs story distinction)
gh label create "scope:epic" \
  --description "Large epic issue (multi-page implementation)" \
  --color "5319e7" \
  --force 2>/dev/null || true

gh label create "scope:story" \
  --description "Story/refinement issue" \
  --color "0e8a16" \
  --force 2>/dev/null || true

echo "   Labels ready"
```

1. **Verify and Fix GitHub CLI Configuration:**
   ```bash
   # Check GitHub CLI repo configuration and auto-fix if needed
   echo "🔍 Verifying GitHub CLI configuration..."

   # Get gh repo (separate command to avoid complex substitution)
   gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null > /tmp/gh_repo.txt || echo "" > /tmp/gh_repo.txt
   GH_REPO=$(cat /tmp/gh_repo.txt)

   # Get git origin (separate command)
   git config --get remote.origin.url | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#' > /tmp/git_origin.txt
   GIT_ORIGIN=$(cat /tmp/git_origin.txt)

   # Auto-fix if mismatch
   if [ -n "$GIT_ORIGIN" ] && [ "$GH_REPO" != "$GIT_ORIGIN" ]; then
     echo "   Setting gh default to: $GIT_ORIGIN"
     gh repo set-default "$GIT_ORIGIN" 2>/dev/null || true
   fi

   # Cleanup
   rm -f /tmp/gh_repo.txt /tmp/git_origin.txt
   ```

2. **Read Design Document:**
   ```bash
   if [[ ! -f "$DOC_PATH" ]]; then
     echo "❌ Design document not found at $DOC_PATH"
     echo "Run /design first."
     exit 1
   fi
   ```

   Use `Read` tool to load the design document from $DOC_PATH.

## Phase 2: Create GitHub Issues

**Mode branches based on SOURCE variable:**

### Mode A: Epic Issue Creation (SOURCE="technical-plan")

**For technical plans, create epic issues from the "## Suggested Epic Structure" section.**

1. **Parse Epic List:**
   - Read "## Suggested Epic Structure" section from technical-plan.md
   - Extract epic definitions (e.g., "EPIC 1: FRONTEND - [scope]")
   - Count total epics

2. **For Each Epic:**

   **Extract Epic Content:**
   - Epic number and name from "## Suggested Epic Structure"
   - Full epic section from "## Technical Implementation" (e.g., "### EPIC 1: FRONTEND" until next epic)
   - Scope and rationale from suggested structure
   - Complete Data Model section (shared across all epics)
   - Architecture Constraints section (shared across all epics)

   **Create Epic Label:**
   ```bash
   EPIC_NAME_LOWER=$(echo "$EPIC_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
   gh label create "epic:$EPIC_NAME_LOWER" \
     --description "Epic: $EPIC_NAME" \
     --color "0366d6" \
     --force 2>/dev/null || true
   ```

   **Issue Title:**
   ```
   EPIC [N]: [NAME]
   ```
   Example: `EPIC 1: FRONTEND`

   **Issue Body:**
   ```markdown
   ## Epic Scope
   [Copy from Suggested Epic Structure]

   ## Rationale
   [Copy rationale from Suggested Epic Structure]

   ## Implementation Order
   This is EPIC [N] of [TOTAL] - implement in sequence

   ## Technical Implementation

   [Copy entire "### EPIC [N]: [NAME]" section from technical-plan.md]

   ---

   ## Complete Data Model

   [Copy entire "## Complete Data Model" section]

   ---

   ## Architecture Constraints

   [Copy entire "## Architecture Constraints" section]

   ---

   ## Technical Plan Reference
   Source: docs/technical-plan.md
   Section: EPIC [N]: [NAME]
   ```

   **Labels:**
   ```bash
   gh issue create \
     --title "$TITLE" \
     --body "$BODY" \
     --label "prd:$SLUG,tide,scope:epic,epic:$EPIC_NAME_LOWER,type:feat,priority:high"
   ```

   Store created issue number for manifest.

---

### Mode B: Story Issue Creation (SOURCE="prd")

**For PRDs, create story issues from "## 2. User Stories" section (EXISTING LOGIC).**

For each User Story, create a GitHub Issue:

**Issue Structure:**
```markdown
## User Story
As a [role], I want [feature], so that [benefit].

## Acceptance Criteria
- [ ] Given [context], when [action], then [outcome]
- [ ] [Additional criteria derived from story]

## Technical Notes
- Architecture constraints from PRD Section 3
- Data model references from PRD Section 4

## PRD Reference
Source: docs/prd/[slug].md
```

**Labels (auto-created and applied):**

*Core Labels:*
- `prd:<slug>` — Scope label for filtering (e.g., `prd:user-auth`)
- `tide` — TIDE workflow marker

*Type Labels (inferred from title):*
- `type:feat` — New features (green)
- `type:fix` — Bug fixes (red)
- `type:refactor` — Code refactoring (blue)
- `type:docs` — Documentation (gray)
- `type:test` — Test-related work (purple)

*Priority Labels:*
- `priority:high` — Critical/blocking (red)
- `priority:medium` — Important (orange) — *default*
- `priority:low` — Nice to have (gray)

**Title Convention:**
- `feat: [action verb] [feature]` for new features
- `fix: [action verb] [issue]` for fixes
- `refactor: [action verb] [component]` for refactoring
- `docs: [action verb] [documentation]` for documentation
- `test: [action verb] [test]` for tests

**Command to create each issue:**
```bash
# Infer type label from issue title
if [[ "$TITLE" =~ ^feat: ]]; then
  TYPE_LABEL="type:feat"
elif [[ "$TITLE" =~ ^fix: ]]; then
  TYPE_LABEL="type:fix"
elif [[ "$TITLE" =~ ^refactor: ]]; then
  TYPE_LABEL="type:refactor"
elif [[ "$TITLE" =~ ^docs: ]]; then
  TYPE_LABEL="type:docs"
elif [[ "$TITLE" =~ ^test: ]]; then
  TYPE_LABEL="type:test"
else
  TYPE_LABEL="type:feat"  # default
fi

# Default priority (can be enhanced later to read from PRD metadata)
PRIORITY_LABEL="priority:medium"

# Create issue with all labels
gh issue create \
  --title "$TITLE" \
  --body "$BODY" \
  --label "prd:$SLUG,tide,$TYPE_LABEL,$PRIORITY_LABEL"
```

## Phase 3: Create Batch Manifest

Write a manifest file for /build to consume:

```bash
mkdir -p .claude/batches

# Get created issue numbers
ISSUES=$(gh issue list --label "prd:$SLUG" --state open --json number,title)
ISSUE_COUNT=$(echo "$ISSUES" | jq length)

# Determine source document path
if [[ "$SOURCE" == "technical-plan" ]]; then
  SOURCE_DOC="docs/technical-plan.md"

  # Extract epic metadata for manifest
  EPIC_ISSUES=$(gh issue list --label "prd:$SLUG,scope:epic" --state open --json number,title,labels)
  EPICS=$(echo "$EPIC_ISSUES" | jq '[.[] | {
    name: (.labels[] | select(.name | startswith("epic:")).name | sub("epic:"; "")),
    label: (.labels[] | select(.name | startswith("epic:")).name),
    issue: .number,
    title: .title
  }]')

  # Write manifest with epic metadata
  cat > ".claude/batches/$SLUG.json" << EOF
{
  "slug": "$SLUG",
  "source_document": "$SOURCE_DOC",
  "label": "prd:$SLUG",
  "created_at": "$(date -Iseconds)",
  "issue_count": $ISSUE_COUNT,
  "epics": $EPICS,
  "issues": $ISSUES
}
EOF
else
  # Legacy PRD manifest
  cat > ".claude/batches/$SLUG.json" << EOF
{
  "slug": "$SLUG",
  "prd": "docs/prd/$SLUG.md",
  "label": "prd:$SLUG",
  "created_at": "$(date -Iseconds)",
  "issue_count": $ISSUE_COUNT,
  "issues": $ISSUES
}
EOF
fi
```

## Phase 4: Update Session & Complete

```bash
# Update session.json (preserve branch info)
mkdir -p .claude
BRANCH_NAME=$(jq -r '.branch // empty' .claude/session.json 2>/dev/null || echo "")
if [[ -n "$BRANCH_NAME" ]]; then
  cat > .claude/session.json << EOF
{
  "current_slug": "$SLUG",
  "branch": "$BRANCH_NAME",
  "phase": "breakdown",
  "updated_at": "$(date -Iseconds)"
}
EOF
else
  cat > .claude/session.json << EOF
{
  "current_slug": "$SLUG",
  "phase": "breakdown",
  "updated_at": "$(date -Iseconds)"
}
EOF
fi
```

Output message based on SOURCE:

**If SOURCE is "technical-plan":**
```
✅ Created [N] EPIC issues for project: $SLUG
   Label: prd:$SLUG
   Manifest: .claude/batches/$SLUG.json

Next steps:
1. Implement EPIC 1 in AutoClaude Desktop
2. Return to evaluate implementation
3. Use /create-issue for bugs/refinements found during evaluation
```

**If SOURCE is "prd":**
```
✅ Created [N] GitHub Issues for PRD: $SLUG
   Label: prd:$SLUG
   Manifest: .claude/batches/$SLUG.json

Run /build to implement all issues.
Run /build --issue N to implement a specific issue.
```

## Constraints

**For Story Issues (PRD mode):**
- **INVEST Compliance:** Each issue must be:
  - **I**ndependent — Can be built without other issues
  - **N**egotiable — Captures intent, not implementation
  - **V**aluable — Delivers user value
  - **E**stimable — Small enough to estimate
  - **S**mall — Fits in one PR (< 500 lines ideally)
  - **T**estable — Has clear acceptance criteria

- **No Implementation Details:** Issues describe WHAT, not HOW.
  auto-claude's Planner decides the HOW.

- **Max 15 Issues:** If PRD yields more than 15 stories, it's too big.
  Suggest splitting into multiple PRDs.

**For Epic Issues (Technical Plan mode):**
- **Epic Count:** Typically 3-5 epics per project
- **Epic Size:** Each epic should be ~4-8 pages of detailed technical content
- **Implementation Details:** Epics MUST contain detailed HOW (not just WHAT)
- **Sequential Implementation:** Epics should be implemented in the suggested order
