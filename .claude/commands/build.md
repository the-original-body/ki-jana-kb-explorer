---
description: Implement GitHub Issues via native Claude agents in parallel worktrees.
model: claude-opus-4-5
allowed-tools: Skill
argument-hint: [app-name-slug] [--manual|--auto-claude] [--issue N]
---

# /build - Implementation Dispatcher

## Overview
Dispatches to the appropriate build implementation based on the `--manual` or `--auto-claude` flag.

## Parse Arguments

```bash
MODE="auto-claude"  # Default to auto-claude (parallel autonomous builds)
PASSTHROUGH_ARGS=""

for arg in $ARGUMENTS; do
  case $arg in
    --manual)
      MODE="manual"
      ;;
    --auto-claude)
      MODE="auto-claude"
      ;;
    *)
      PASSTHROUGH_ARGS="$PASSTHROUGH_ARGS $arg"
      ;;
  esac
done
```

## Dispatch

**If MODE is "manual":**
Run `/build-manual $PASSTHROUGH_ARGS`

**If MODE is "auto-claude":**
Run `/build-auto-claude $PASSTHROUGH_ARGS`

## Usage Examples

```bash
# Build using auto-claude (default)
/build user-auth

# Explicitly use auto-claude
/build user-auth --auto-claude

# Use native agents (manual mode)
/build user-auth --manual

# Build single issue with auto-claude (default)
/build --issue 42

# Build single issue with native agents
/build --issue 42 --manual
```
