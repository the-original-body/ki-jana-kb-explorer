#!/usr/bin/env bash
# build-cleanup.sh — Clean up after build
#
# Removes:
# - Status files (.auto-claude/status/)
# - Spec files (.auto-claude/specs/)
# - Log files (.auto-claude/logs/)
# - Worktrees (.worktrees/auto-claude/)
# - Session file (.claude/session.json)
#
# Usage: ./build-cleanup.sh [--all] [--worktrees] [--status] [--logs]

set -euo pipefail

CLEAN_ALL=false
CLEAN_WORKTREES=false
CLEAN_STATUS=false
CLEAN_LOGS=false

# Parse arguments
if [[ $# -eq 0 ]]; then
    CLEAN_ALL=true
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)       CLEAN_ALL=true; shift ;;
        --worktrees) CLEAN_WORKTREES=true; shift ;;
        --status)    CLEAN_STATUS=true; shift ;;
        --logs)      CLEAN_LOGS=true; shift ;;
        --help|-h)
            echo "Usage: $0 [--all] [--worktrees] [--status] [--logs]"
            echo ""
            echo "Options:"
            echo "  --all        Clean everything (default if no args)"
            echo "  --worktrees  Clean .worktrees/auto-claude/"
            echo "  --status     Clean .auto-claude/status/ and .auto-claude/specs/"
            echo "  --logs       Clean .auto-claude/logs/"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "🧹 Cleaning up build artifacts..."

# Clean worktrees
if [[ "$CLEAN_ALL" == true || "$CLEAN_WORKTREES" == true ]]; then
    if [[ -d ".worktrees/auto-claude" ]]; then
        echo "  → Removing worktrees..."
        
        # List and remove each worktree properly
        for wt in .worktrees/auto-claude/*/; do
            [[ -d "$wt" ]] || continue
            WT_PATH=$(realpath "$wt")
            echo "    Removing: $WT_PATH"
            git worktree remove --force "$WT_PATH" 2>/dev/null || rm -rf "$WT_PATH"
        done
        
        # Cleanup worktree metadata
        git worktree prune 2>/dev/null || true
        
        rmdir .worktrees/auto-claude 2>/dev/null || true
        rmdir .worktrees 2>/dev/null || true
        echo "  ✓ Worktrees cleaned"
    else
        echo "  ⏭️  No worktrees to clean"
    fi
fi

# Clean status and specs
if [[ "$CLEAN_ALL" == true || "$CLEAN_STATUS" == true ]]; then
    if [[ -d ".auto-claude/status" ]]; then
        echo "  → Removing status files..."
        rm -rf .auto-claude/status
        echo "  ✓ Status files cleaned"
    fi
    
    if [[ -d ".auto-claude/specs" ]]; then
        echo "  → Removing spec files..."
        rm -rf .auto-claude/specs
        echo "  ✓ Spec files cleaned"
    fi
fi

# Clean logs
if [[ "$CLEAN_ALL" == true || "$CLEAN_LOGS" == true ]]; then
    if [[ -d ".auto-claude/logs" ]]; then
        echo "  → Removing log files..."
        rm -rf .auto-claude/logs
        echo "  ✓ Log files cleaned"
    fi
fi

# Clean session file
if [[ "$CLEAN_ALL" == true ]]; then
    if [[ -f ".claude/session.json" ]]; then
        echo "  → Removing session file..."
        rm -f .claude/session.json
        echo "  ✓ Session file cleaned"
    fi
fi

# Remove empty .auto-claude directory
rmdir .auto-claude 2>/dev/null || true

echo ""
echo "✅ Cleanup complete"
