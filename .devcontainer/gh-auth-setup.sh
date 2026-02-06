#!/usr/bin/env bash
# Extracts GitHub token from git remote and sets GH_TOKEN for gh CLI
# This script is sourced by the shell to persist the environment variable

# Extract token from git remote URL (supports both https:// and git@ formats)
extract_gh_token() {
    local token=""

    # Try to extract from origin remote
    token=$(git remote get-url origin 2>/dev/null | grep -oP 'gho_[^@]+' || echo "")

    # If not found in origin, try upstream
    if [ -z "$token" ]; then
        token=$(git remote get-url upstream 2>/dev/null | grep -oP 'gho_[^@]+' || echo "")
    fi

    echo "$token"
}

# Set GH_TOKEN if not already set
if [ -z "$GH_TOKEN" ]; then
    GH_TOKEN=$(extract_gh_token)

    if [ -n "$GH_TOKEN" ]; then
        export GH_TOKEN
    fi
fi
