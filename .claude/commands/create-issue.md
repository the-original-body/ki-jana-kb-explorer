---
description: Create GitHub issue in the REMOTE repository with technical implementation plan.
model: claude-opus-4-5
allowed-tools: Bash, Read
argument-hint: "[issue-hint]"
---

ultrathink

# /create-issue - Create Remote Issue

Creates a GitHub issue in the REMOTE repository (your project). If remote equals upstream, that's fine—issue goes to remote.

## Target Repository

Always create in REMOTE. Verify with:

```bash
gh repo view --json nameWithOwner -q .nameWithOwner
```

## Modes

**1. With Hint:** `/create-issue "Add OAuth support"`
**2. No Hint:** `/create-issue` (analyze chat history)

## Detect TIDE Project Context

Check if we're in a TIDE project to apply appropriate labels:

```bash
IN_TIDE=false
CURRENT_SLUG=""
EPIC_CONTEXT=""

if [[ -f ".claude/session.json" ]]; then
  IN_TIDE=true
  CURRENT_SLUG=$(jq -r '.current_slug // ""' .claude/session.json)

  # Try to infer epic from recent conversation context
  # Look for mentions of "epic 1", "frontend", "EPIC 2", "backend", etc.
  # This is best-effort - user can manually add epic label if needed
fi
```

## Issue Structure

Use chat history and RedwoodSDK knowledge to generate:

```markdown
# Title (following convention: type: description)

## Problem
Clear description of what needs fixing/building and why.

## Proposed Solution
Detailed technical implementation plan:
- Architecture decisions (RedwoodSDK patterns, Durable Objects vs D1, etc.)
- Data model changes (if applicable)
- API endpoints or route changes
- Security considerations
- Edge cases to handle

## Technical Constraints
- Cloudflare Workers limitations
- RedwoodSDK patterns to follow
- D1 migration requirements

[If IN_TIDE is true, add:]
## Context
Part of project: $CURRENT_SLUG
[If epic detected: Epic: $EPIC_CONTEXT]
```

Load relevant skills when needed:
- `.claude/skills/architecting-redwood/SKILL.md`
- `.claude/skills/managing-d1-migrations/SKILL.md`

## Label Detection & Application

Infer labels from title and body content:

```bash
# Infer type from title prefix or body keywords
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
  # Infer from body content
  if [[ "$BODY" =~ (bug|error|broken|failing) ]]; then
    TYPE_LABEL="type:bug"
  else
    TYPE_LABEL="type:enhancement"
  fi
fi

# Infer priority from severity keywords in body
if [[ "$BODY" =~ (critical|blocker|security|data.loss) ]]; then
  PRIORITY_LABEL="priority:high"
elif [[ "$BODY" =~ (important|should|needed) ]]; then
  PRIORITY_LABEL="priority:medium"
else
  PRIORITY_LABEL="priority:low"
fi

# Build labels array
LABELS="$TYPE_LABEL,$PRIORITY_LABEL"

if [[ "$IN_TIDE" == true ]]; then
  LABELS="$LABELS,prd:$CURRENT_SLUG,tide,scope:story"

  # Add epic label if detected from conversation
  if [[ -n "$EPIC_CONTEXT" ]]; then
    LABELS="$LABELS,epic:$EPIC_CONTEXT"
  fi
fi
```

## Create

```bash
gh issue create --title "$TITLE" --body "$BODY" --label "$LABELS"
```

Report issue details including applied labels:
```
✅ Issue created: #123 in owner/repo
   Labels: $LABELS
```

## Key Differences

- `/create-issue`: Prescriptive technical implementation plan for AutoClaude
- `/propose-upstream`: Diagnostic problem report, no prescribed solution
