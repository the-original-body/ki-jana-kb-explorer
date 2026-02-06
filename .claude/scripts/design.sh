#!/bin/bash
# design.sh - Bash logic for /design command
# Handles argument parsing, branch setup, and session management

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

usage() {
  cat << 'USAGE'
Usage: design.sh <subcommand> [args]

Subcommands:
  parse <arguments>        Parse arguments, output MODE and SLUG
  setup <slug> <mode>      Create branch and initialize session
  complete <slug>          Mark design phase as complete

Examples:
  design.sh parse "user-auth --import"
  design.sh setup user-auth interactive
  design.sh complete user-auth
USAGE
  exit 1
}

# Subcommand: parse
# Parses arguments and outputs MODE and SLUG
cmd_parse() {
  local MODE="interactive"
  local SLUG=""

  for arg in $@; do
    case $arg in
      --import)
        MODE="import"
        ;;
      *)
        # First non-flag argument that looks like a slug (short, no spaces)
        if [[ -z "$SLUG" && ! "$arg" =~ ^-- && ${#arg} -lt 100 ]]; then
          SLUG="$arg"
        fi
        ;;
    esac
  done

  echo "MODE=$MODE"
  echo "SLUG=$SLUG"
}

# Subcommand: setup
# Creates branch, cleans artifacts, initializes session
cmd_setup() {
  local SLUG="${1:-}"
  local MODE="${2:-interactive}"

  if [[ -z "$SLUG" ]]; then
    echo "Error: slug required for setup"
    exit 1
  fi

  cd "$PROJECT_ROOT"

  # Determine branch type from slug
  local BRANCH_TYPE="feat"
  if [[ "$SLUG" =~ ^fix- ]] || [[ "$SLUG" =~ -fix$ ]] || [[ "$SLUG" =~ -bug ]]; then
    BRANCH_TYPE="fix"
  fi
  local BRANCH_NAME="${BRANCH_TYPE}/${SLUG}"

  # Check if PRD already exists (immutability rule)
  if [[ -f "docs/prd/$SLUG.md" ]]; then
    echo "Error: PRD already exists at docs/prd/$SLUG.md"
    echo "PRDs are immutable. Use a different slug or delete the existing PRD manually."
    exit 1
  fi

  # Check if Technical Plan already exists (immutability rule)
  if [[ -f "docs/technical-plan.md" ]]; then
    echo "Error: Technical Plan already exists at docs/technical-plan.md"
    echo "Technical Plans are immutable. Use a different slug or delete the existing plan manually."
    exit 1
  fi

  # Clean up previous sprint artifacts (new sprint starting)
  if [[ -d ".auto-claude/specs" ]] || [[ -d ".auto-claude/status" ]] || [[ -d ".worktrees/auto-claude" ]]; then
    echo "Cleaning previous sprint artifacts..."

    # Clean specs
    [[ -d ".auto-claude/specs" ]] && rm -rf .auto-claude/specs && echo "   Removed specs/"

    # Clean status
    [[ -d ".auto-claude/status" ]] && rm -rf .auto-claude/status && echo "   Removed status/"

    # Clean worktrees
    if [[ -d ".worktrees/auto-claude" ]]; then
      for wt in .worktrees/auto-claude/*/; do
        [[ -d "$wt" ]] || continue
        local WT_PATH
        WT_PATH=$(realpath "$wt")
        git worktree remove --force "$WT_PATH" 2>/dev/null || rm -rf "$WT_PATH"
      done
      git worktree prune 2>/dev/null || true
      rmdir .worktrees/auto-claude 2>/dev/null || true
      rmdir .worktrees 2>/dev/null || true
      echo "   Removed worktrees/"
    fi

    echo "   Cleanup complete"
  fi

  # Ensure we start from main and it's up to date
  echo "Syncing with main branch..."
  git checkout main
  git pull origin main

  # Create and switch to feature branch
  echo "Creating branch: $BRANCH_NAME"
  git checkout -b "$BRANCH_NAME"

  # Determine output document type
  local OUTPUT_DOC="docs/prd/$SLUG.md"
  if [[ -f "docs/SPECIFICATIONS.md" ]]; then
    OUTPUT_DOC="docs/technical-plan.md"
  fi

  # Initialize session.json with branch info
  mkdir -p .claude
  cat > .claude/session.json << ENDSESSION
{
  "current_slug": "$SLUG",
  "branch": "$BRANCH_NAME",
  "phase": "design",
  "mode": "$MODE",
  "output_document": "$OUTPUT_DOC",
  "updated_at": "$(date -Iseconds)"
}
ENDSESSION

  echo "Session started: $SLUG"
  echo "Branch: $BRANCH_NAME"
}

# Subcommand: complete
# Updates session.json to mark design as complete
cmd_complete() {
  local SLUG="${1:-}"

  if [[ -z "$SLUG" ]]; then
    echo "Error: slug required for complete"
    exit 1
  fi

  cd "$PROJECT_ROOT"

  # Clean up progress file
  rm -f ".claude/progress/design-$SLUG.md"

  # Get existing session data
  local BRANCH_NAME
  BRANCH_NAME=$(jq -r '.branch' .claude/session.json)
  local OUTPUT_DOC
  OUTPUT_DOC=$(jq -r '.output_document // "docs/prd/'$SLUG'.md"' .claude/session.json)

  # Update session.json phase
  cat > .claude/session.json << ENDSESSION
{
  "current_slug": "$SLUG",
  "branch": "$BRANCH_NAME",
  "phase": "design-complete",
  "output_document": "$OUTPUT_DOC",
  "updated_at": "$(date -Iseconds)"
}
ENDSESSION

  echo "Design phase complete for: $SLUG"
}

# Main dispatch
case "${1:-}" in
  parse)
    shift
    cmd_parse "$@"
    ;;
  setup)
    shift
    cmd_setup "$@"
    ;;
  complete)
    shift
    cmd_complete "$@"
    ;;
  *)
    usage
    ;;
esac
