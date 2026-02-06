---
name: managing-git-workflow
description: |
  Ensures correct git context before making changes. Triggers when user
  discusses a new feature/topic while on wrong branch, attempts work on main,
  or context shifts from current session. Does NOT trigger on explicit git
  commands - user is already handling workflow.
---

# Git Workflow Guardian

> Detects context mismatches and ensures work happens on the right branch.

## 1. Context Injection (MANDATORY)

**Before any implementation work**, check git context:

- **IF** user asks about deployments/environments/releases:
  `Read("reference/deployment-workflow.md")`

- **IF** creating branch or discussing naming conventions:
  `Read("reference/branch-conventions.md")`

## 2. Context Check Protocol

Run these checks silently before implementing any user request:

### Check 1: Protected Branch

```bash
git branch --show-current
```

- **If on `main`**: STOP. Inform user and offer to create/switch branch.
- **If on feature branch**: Continue.

### Check 2: Session Alignment

If `.claude/session.json` exists, verify user's request aligns with `current_slug`.

- **If mismatch detected** (user discussing different feature):
  - Inform user of context shift
  - Offer: commit current work → switch, or continue on current branch

### Check 3: Uncommitted Changes

```bash
git status --porcelain
```

- **If uncommitted changes exist AND switching context**:
  - Offer: commit, stash, or discard before switching

## 3. When to Trigger

**DO trigger on:**
- User wants to implement something but is on wrong branch
- User discusses feature X while session shows feature Y
- User about to edit files while on `main`
- No session exists but user wants to implement

**DO NOT trigger on:**
- User explicitly says "commit", "push", "create branch" (they're aware)
- User asks questions about git (information request)
- User is doing research/exploration (no edits)

## 4. Response Patterns

### On Main Branch
```
You're currently on `main` which is protected.

Options:
1. Create new branch: `git checkout -b feat/<slug>`
2. Switch to existing: `git checkout feat/<existing>`
3. Run `/design` to start a new TIDE cycle
```

### Context Shift Detected
```
You're working on `feat/user-auth` but this request seems related to [new topic].

Options:
1. Commit current work and create new branch for [new topic]
2. Continue on current branch (if related)
3. Stash changes and switch
```

### No Session
```
No active session found. For structured work:
- Run `/design <feature>` to start TIDE workflow

For quick fixes:
- Create branch: `git checkout -b fix/<description>`
```

## 5. Critical Rules

**ALWAYS:**
- Check branch before any file edits
- Respect user's explicit git commands (don't second-guess)
- Offer options, don't block

**NEVER:**
- Trigger on explicit git keywords (user is handling it)
- Silently switch branches
- Auto-commit without user consent
