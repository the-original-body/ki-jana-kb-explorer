#!/usr/bin/env bash
# =============================================================================
# propose-upstream.sh - Create GitHub issue in upstream template repository
# =============================================================================
#
# PURPOSE:
# Creates a GitHub issue in the upstream CAPS template repository to propose
# improvements, report bugs, or document skill gaps discovered in downstream projects.
#
# CRITICAL: READ THIS BEFORE MODIFYING AUTHENTICATION
# ====================================================
# This script requires authentication to the PRIVATE upstream template repository.
# The authentication mechanism has been carefully designed for GitHub Codespaces.
#
# AUTHENTICATION APPROACH (DO NOT CHANGE):
# ----------------------------------------
# We export TEMPLATE_ACCESS_TOKEN as GITHUB_TOKEN at script start.
#
# This is REQUIRED because:
#
# 1. The gh CLI uses GITHUB_TOKEN for authentication
# 2. In Codespaces, GITHUB_TOKEN is auto-injected but scoped to CURRENT repo only
# 3. GITHUB_TOKEN does NOT have access to the upstream template repo
# 4. TEMPLATE_ACCESS_TOKEN has write access to the upstream repo
# 5. By exporting it as GITHUB_TOKEN, all gh commands use the correct token
#
# FAILED APPROACHES (DO NOT TRY THESE AGAIN):
# -------------------------------------------
# - Relying on gh auth login in post-create.sh (gets overridden by GITHUB_TOKEN)
# - Using GH_TOKEN (GITHUB_TOKEN takes precedence)
# - Not overriding GITHUB_TOKEN (causes "repository not found" errors)
#
# The fix (PR #60) added the GITHUB_TOKEN export below.
#
# USAGE:
#   ./propose-upstream.sh "<issue description>" "<priority>"
#
# EXAMPLE:
#   ./propose-upstream.sh "Missing skill for handling OAuth patterns in RedwoodSDK" "medium"
#
# Environment Variables:
#   TEMPLATE_ACCESS_TOKEN - GitHub PAT with write access to upstream repo (REQUIRED)
#   TEMPLATE_UPSTREAM     - Override upstream URL (optional)
#
# =============================================================================
set -euo pipefail

# ============================================
# Configure authentication for upstream repo
# ============================================
# CRITICAL: This export is REQUIRED for Codespaces. DO NOT REMOVE.
#
# In Codespaces, GITHUB_TOKEN is auto-injected but scoped to the CURRENT repo.
# The gh CLI will use this token by default, which causes "repository not found"
# errors when trying to access the upstream template repo.
#
# By exporting TEMPLATE_ACCESS_TOKEN as GITHUB_TOKEN, we override the
# Codespaces-injected token so gh CLI uses our token with upstream access.
#
# WARNING: Do not try to "improve" this by:
# - Removing this export (breaks Codespaces)
# - Using GH_TOKEN instead (GITHUB_TOKEN takes precedence)
# - Relying on gh auth login (gets overridden by env var)
# =============================================================================
if [ -n "${TEMPLATE_ACCESS_TOKEN:-}" ]; then
    export GITHUB_TOKEN="$TEMPLATE_ACCESS_TOKEN"
    echo "Using TEMPLATE_ACCESS_TOKEN for upstream authentication"
fi

# ============================================
# Validate arguments
# ============================================
if [[ -z "${1:-}" ]]; then
  echo "Usage: propose-upstream.sh \"<issue description>\" \"<priority>\""
  echo ""
  echo "Priority: high, medium, or low"
  echo "Example: propose-upstream.sh \"Missing skill for handling OAuth patterns in RedwoodSDK\" \"medium\""
  exit 1
fi

# Strip leading/trailing quotes from arguments if present
DESCRIPTION=$(echo "$1" | sed -E "s/^['\"]//; s/['\"]$//")
PRIORITY=$(echo "${2:-medium}" | sed -E "s/^['\"]//; s/['\"]$//" | tr '[:upper:]' '[:lower:]')

# Validate priority value
if [[ ! "$PRIORITY" =~ ^(high|medium|low)$ ]]; then
  echo "Error: Priority must be 'high', 'medium', or 'low' (got: '$PRIORITY')"
  exit 1
fi

# ============================================
# Extract template repository
# ============================================
TEMPLATE_URL="${TEMPLATE_UPSTREAM:-https://github.com/the-original-body/tob-webapp-stack.git}"
TEMPLATE_REPO=$(echo "$TEMPLATE_URL" | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')

echo "Template repo: $TEMPLATE_REPO"

# ============================================
# Get source context
# ============================================
GIT_ORIGIN_URL=$(git config --get remote.origin.url 2>/dev/null || echo "unknown")
SOURCE_REPO=$(echo "$GIT_ORIGIN_URL" | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')

echo "Source repo: $SOURCE_REPO"

# ============================================
# Determine issue type from keywords
# ============================================
if echo "$DESCRIPTION" | grep -qiE 'bug|broken|error|fail|crash'; then
  TYPE_LABEL="type:bug"
elif echo "$DESCRIPTION" | grep -qiE 'skill|missing|knowledge|gap'; then
  TYPE_LABEL="type:skill-gap"
elif echo "$DESCRIPTION" | grep -qiE 'slow|inefficient|optimize|performance'; then
  TYPE_LABEL="type:enhancement"
else
  TYPE_LABEL="type:enhancement"
fi

echo "Issue type: $TYPE_LABEL"

# ============================================
# Ensure labels exist in template repo
# ============================================
echo "Ensuring labels exist in template repo..."

gh label create "upstream-proposal" \
  --repo "$TEMPLATE_REPO" \
  --description "Proposed from downstream project" \
  --color "d4a5ff" \
  --force 2>/dev/null || true

gh label create "type:bug" \
  --repo "$TEMPLATE_REPO" \
  --description "Bug report" \
  --color "d73a4a" \
  --force 2>/dev/null || true

gh label create "type:enhancement" \
  --repo "$TEMPLATE_REPO" \
  --description "Enhancement proposal" \
  --color "a2eeef" \
  --force 2>/dev/null || true

gh label create "type:skill-gap" \
  --repo "$TEMPLATE_REPO" \
  --description "Missing skill or knowledge gap" \
  --color "f9d0c4" \
  --force 2>/dev/null || true

gh label create "priority:high" \
  --repo "$TEMPLATE_REPO" \
  --description "Critical issue blocking core functionality" \
  --color "b60205" \
  --force 2>/dev/null || true

gh label create "priority:medium" \
  --repo "$TEMPLATE_REPO" \
  --description "Important improvement with workarounds" \
  --color "fbca04" \
  --force 2>/dev/null || true

gh label create "priority:low" \
  --repo "$TEMPLATE_REPO" \
  --description "Nice-to-have enhancement" \
  --color "0e8a16" \
  --force 2>/dev/null || true

# ============================================
# Create issue
# ============================================
# Generate title from first line (truncated to 120 chars for better readability)
# GitHub supports up to 256 chars, but 120 provides a good balance
TITLE=$(echo "$DESCRIPTION" | head -n1 | cut -c1-120)

# Create body with full description + source context
BODY="## Proposed Improvement

$DESCRIPTION

----
**Source:** \`$SOURCE_REPO\`
**Context:** Discovered during /retro sprint review"

# Create issue in template repo
PRIORITY_LABEL="priority:$PRIORITY"
ISSUE_URL=$(gh issue create \
  --repo "$TEMPLATE_REPO" \
  --title "$TITLE" \
  --body "$BODY" \
  --label "upstream-proposal,$TYPE_LABEL,$PRIORITY_LABEL")

echo ""
echo "Created upstream issue: $ISSUE_URL"
echo "   Repository: $TEMPLATE_REPO"
echo "   Labels: upstream-proposal, $TYPE_LABEL, $PRIORITY_LABEL"
