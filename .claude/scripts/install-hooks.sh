#!/usr/bin/env bash
# install-hooks.sh - Install git hooks for project safety
#
# This script installs git hooks that protect the repository from common mistakes:
# - Prevents direct commits to main branch
# - Can be extended with additional safety checks
#
# Usage: bash .claude/scripts/install-hooks.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOKS_SRC="$PROJECT_ROOT/.claude/hooks"
HOOKS_DEST="$PROJECT_ROOT/.git/hooks"

echo "Installing git hooks..."

# Install pre-commit hook
if [ -f "$HOOKS_SRC/pre-commit" ]; then
    cp "$HOOKS_SRC/pre-commit" "$HOOKS_DEST/pre-commit"
    chmod +x "$HOOKS_DEST/pre-commit"
    echo "✓ Installed pre-commit hook (protects main branch)"
else
    echo "⚠️  pre-commit hook not found in $HOOKS_SRC"
fi

echo ""
echo "✅ Git hooks installed successfully"
echo ""
echo "Branch Protection Summary:"
echo "=========================="
echo ""
echo "1. PreToolUse Hook (settings.json)"
echo "   • Blocks Edit/Write tools when on main branch"
echo "   • Prevents file modifications before they happen"
echo "   • Active immediately (no git operations needed)"
echo ""
echo "2. Git pre-commit Hook"
echo "   • Blocks commits to main branch"
echo "   • Catches any changes that get through"
echo "   • Bypass: git commit --no-verify (emergency only)"
echo ""
echo "All changes must go through feature branches and PRs."
