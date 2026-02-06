#!/usr/bin/env bash
# check-branch.sh - Prevent file edits on protected branches
#
# This hook runs before Edit/Write tools and blocks them if on main branch.
# Installed automatically via settings.json PreToolUse hook.

set -e

# Get current branch
current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")

# Block edits on protected branches
if [[ "$current_branch" == "main" || "$current_branch" == "master" ]]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "❌ File edits are blocked on the '$current_branch' branch.\n\nAll changes must go through feature branches.\n\nTo fix:\n  1. Create a feature branch: git checkout -b feat/your-feature\n  2. Make your changes on that branch\n  3. Push and create a PR when ready\n\nIf you need to make an emergency edit to main, disable this hook temporarily."
  }
}
EOF
  exit 0
fi

# Allow the tool to proceed on feature branches
exit 0
