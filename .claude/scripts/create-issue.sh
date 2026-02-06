#!/usr/bin/env bash
# =============================================================================
# create-issue.sh - Create GitHub issue in REMOTE repository (NOT upstream)
# =============================================================================
#
# PURPOSE:
# Creates a GitHub issue in the current/remote project repository.
# This script is ONLY for project-specific issues, NOT for CAPS improvements.
#
# CRITICAL SAFETY:
# ================
# This script MUST NEVER create issues in the upstream/template repository.
# For template improvements, use propose-upstream.sh instead.
#
# USAGE:
#   ./create-issue.sh "<title>" "<body>" "<labels>"
#
# EXAMPLES:
#   ./create-issue.sh "Add authentication" "Need OAuth support" "enhancement"
#   ./create-issue.sh "Fix login bug" "Users can't log in" "bug,priority:high"
#   ./create-issue.sh "Update docs" "" "documentation"
#
# Arguments:
#   $1 - Issue title (REQUIRED)
#   $2 - Issue body (optional, can be empty string)
#   $3 - Comma-separated labels (optional, can be empty string)
#
# Environment Variables:
#   TEMPLATE_UPSTREAM - Template repo URL (used for safety check)
#
# =============================================================================
set -euo pipefail

# ============================================
# Validate arguments
# ============================================
if [[ -z "${1:-}" ]]; then
  echo "❌ Error: Issue title is required"
  echo ""
  echo "Usage: create-issue.sh \"<title>\" \"<body>\" \"<labels>\""
  echo ""
  echo "Examples:"
  echo "  create-issue.sh \"Add authentication\" \"Need OAuth support\" \"enhancement\""
  echo "  create-issue.sh \"Fix bug\" \"\" \"bug,priority:high\""
  exit 1
fi

# Parse arguments
TITLE="$1"
BODY="${2:-}"
LABELS="${3:-}"

# ============================================
# Repository Safety Check
# ============================================
echo "🔍 Verifying target repository..."

# Get current repository info
CURRENT_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Current repository: $CURRENT_REPO"

# Get template/upstream repository
TEMPLATE_URL="${TEMPLATE_UPSTREAM:-https://github.com/the-original-body/tob-webapp-stack.git}"
TEMPLATE_REPO=$(echo "$TEMPLATE_URL" | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')
echo "Template repository: $TEMPLATE_REPO"

# CRITICAL SAFETY CHECK: Prevent upstream issue creation
if [[ "$CURRENT_REPO" == "$TEMPLATE_REPO" ]]; then
  echo ""
  echo "❌ SAFETY CHECK FAILED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "You are in the UPSTREAM/TEMPLATE repository!"
  echo ""
  echo "This command is for PROJECT issues only, not template issues."
  echo ""
  echo "To create an upstream issue:"
  echo "  Use: /propose-upstream <description>"
  echo ""
  echo "To create a project issue:"
  echo "  Switch to your project repository first"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

echo "✅ Target confirmed: $CURRENT_REPO (remote repository)"
echo ""

# ============================================
# Validate secrets are not included
# ============================================
# Check for common secret patterns in title and body
SECRET_PATTERNS=(
  "sk-[a-zA-Z0-9]{32,}"      # OpenAI API keys
  "ghp_[a-zA-Z0-9]{36}"      # GitHub PATs
  "gho_[a-zA-Z0-9]{36}"      # GitHub OAuth tokens
  "[A-Za-z0-9+/]{40,}={0,2}" # Base64 encoded secrets
  "AIza[0-9A-Za-z_-]{35}"    # Google API keys
)

COMBINED_TEXT="$TITLE $BODY"
for pattern in "${SECRET_PATTERNS[@]}"; do
  if echo "$COMBINED_TEXT" | grep -qE "$pattern"; then
    echo "❌ Error: Detected potential secret or API key in issue content"
    echo "Please use environment variable references instead (e.g., CLOUDFLARE_API_TOKEN)"
    exit 1
  fi
done

# ============================================
# Create the issue
# ============================================
echo "📝 Creating issue..."

# Build gh issue create command
GH_CMD="gh issue create --title \"$TITLE\""

# Add body if provided
if [[ -n "$BODY" ]]; then
  GH_CMD="$GH_CMD --body \"$BODY\""
else
  GH_CMD="$GH_CMD --body \"(No description provided)\""
fi

# Add labels if provided
if [[ -n "$LABELS" ]]; then
  GH_CMD="$GH_CMD --label \"$LABELS\""
fi

# Execute the command
ISSUE_URL=$(eval "$GH_CMD")

# ============================================
# Report success
# ============================================
echo ""
echo "✅ Issue created successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL: $ISSUE_URL"
echo "Repository: $CURRENT_REPO (REMOTE)"
if [[ -n "$LABELS" ]]; then
  echo "Labels: $LABELS"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
