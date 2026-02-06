# Claude Code Hooks

This directory contains hooks that enforce project safety and workflow standards.

## Active Hooks

### 1. check-branch.sh (PreToolUse)
**Purpose**: Prevents file edits on protected branches
**Trigger**: Before Edit/Write tools execute
**Configuration**: `.claude/settings.json` → `hooks.PreToolUse`

Blocks file modifications when on `main` or `master` branch. Forces all changes to go through feature branches.

**Activated by**: settings.json (automatic)

### 2. pre-commit (Git Hook)
**Purpose**: Prevents commits to protected branches
**Trigger**: Before git commit executes
**Configuration**: `.git/hooks/pre-commit` (installed via script)

Second layer of protection that catches any changes that bypass the PreToolUse hook (e.g., manual edits outside Claude Code).

**Activated by**: Run `bash .claude/scripts/install-hooks.sh`

## Protection Strategy

**Two-Layer Defense:**
1. **PreToolUse Hook** → Prevents edits before they happen
2. **Git Hook** → Catches commits if edits somehow get through

This ensures main branch stays clean regardless of how changes are made.

## Emergency Bypass

If you absolutely must make a change on main (emergency hotfix):

```bash
# Bypass PreToolUse: Temporarily disable in settings.json
# Bypass git hook: git commit --no-verify
```

**Note**: Use `--no-verify` sparingly. In most cases, create a feature branch instead.

## Installation

The PreToolUse hook is active immediately via settings.json.

The git hook requires installation:
```bash
bash .claude/scripts/install-hooks.sh
```

Run this after cloning the repository or if git hooks get removed.
