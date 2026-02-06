#!/bin/bash
# =============================================================================
# template-sync.sh - Safe selective sync from upstream CAPS template
# =============================================================================
#
# CRITICAL: READ THIS BEFORE MODIFYING
# =====================================
# This script handles authentication to the PRIVATE upstream template repository.
# The authentication mechanism is FRAGILE and has been broken multiple times by
# well-intentioned "improvements". If you break this, downstream repos CANNOT
# receive updates anymore.
#
# AUTHENTICATION APPROACH (DO NOT CHANGE):
# ----------------------------------------
# We use TOKEN-IN-URL authentication: https://TOKEN@github.com/...
#
# This is the ONLY approach that works reliably in GitHub Codespaces because:
#
# 1. Codespaces has a SYSTEM-LEVEL credential helper at /etc/gitconfig:
#    credential.helper=/.codespaces/bin/gitcredential_github.sh
#
# 2. This system helper ALWAYS runs first and returns GITHUB_TOKEN credentials
#
# 3. GITHUB_TOKEN is scoped to the CURRENT repo, NOT the upstream template repo
#
# 4. Any credential helper we configure in ~/.gitconfig runs AFTER the system
#    helper, but git already got credentials from step 2, so ours is ignored
#
# 5. The ONLY way to override this is to embed the token directly in the URL,
#    which bypasses the credential helper chain entirely
#
# FAILED APPROACHES (DO NOT TRY THESE AGAIN):
# -------------------------------------------
# - Git credential helpers (PR #9afd906) - System helper takes precedence
# - GIT_ASKPASS environment variable - Still goes through credential chain
# - SSH agent forwarding - Requires SSH keys on host, breaks in Codespaces
# - Credential helper with useHttpPath - System helper still wins
#
# HISTORY OF BREAKAGES:
# ---------------------
# - PR #9afd906: Switched to credential helper → Broke all Codespaces users
# - PR #47: Added SSH agent as first priority → Broke when socket doesn't exist
# - PR #54: Added SSH_AUTH_SOCK mount → Broke when no agent on host
#
# The fix (PR #57) reverted to token-in-URL from commit ec48ea9.
#
# =============================================================================
#
# This script syncs only CAPS-owned files from the template repository,
# leaving app-owned files completely untouched.
#
# Usage:
#   ./template-sync.sh          # Interactive: sync, show changes, commit
#   ./template-sync.sh --check  # Dry-run: show what would change
#   ./template-sync.sh --auto   # Silent: sync without commit (for SessionStart)
#
# Ownership categories (defined in .caps-sync.yml):
#   - template_owned: Always overwritten from upstream
#   - shared: Smart merge strategies preserve both sides
#   - app_owned: Never touched
#
# Environment Variables:
#   TEMPLATE_ACCESS_TOKEN - GitHub PAT with read access to upstream repo (REQUIRED for private repos)
#   TEMPLATE_UPSTREAM     - Override upstream URL (optional, defaults to tob-webapp-stack)
#
# =============================================================================

set -e

# =============================================================================
# Configuration
# =============================================================================
CONFIG_FILE=".caps-sync.yml"
UPSTREAM_BRANCH="main"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# =============================================================================
# Parse arguments
# =============================================================================
MODE="interactive"
[[ "$1" == "--check" ]] && MODE="check"
[[ "$1" == "--auto" ]] && MODE="auto"

# =============================================================================
# Setup upstream remote
# =============================================================================
# CRITICAL FUNCTION - DO NOT MODIFY WITHOUT READING HEADER COMMENTS
#
# This function configures the git remote for the upstream template repository.
# It uses TOKEN-IN-URL authentication which is the ONLY method that works in
# GitHub Codespaces (see header comments for why).
#
# How it works:
# 1. Takes the base URL (from TEMPLATE_UPSTREAM or default)
# 2. If TEMPLATE_ACCESS_TOKEN is set, embeds it in the URL
# 3. Sets or updates the 'upstream' git remote with this URL
#
# The token-in-URL format: https://TOKEN@github.com/owner/repo.git
# This bypasses git's credential helper chain entirely.
#
# WARNING: Do not try to "improve" this by:
# - Using git credential helpers (they don't work in Codespaces)
# - Using SSH URLs (requires SSH keys which users may not have)
# - Using GIT_ASKPASS (still goes through credential chain)
# =============================================================================
setup_upstream() {
    # Default repo URL, can be overridden via TEMPLATE_UPSTREAM env var
    local REPO_URL="${TEMPLATE_UPSTREAM:-https://github.com/the-original-body/tob-webapp-stack.git}"

    # CRITICAL: Embed token directly in URL for authentication
    # This is the ONLY method that works in Codespaces - see header comments
    if [ -n "${TEMPLATE_ACCESS_TOKEN:-}" ]; then
        # Insert token into URL: https://github.com -> https://TOKEN@github.com
        # This bypasses the credential helper chain entirely
        UPSTREAM_REPO=$(echo "$REPO_URL" | sed "s|https://|https://${TEMPLATE_ACCESS_TOKEN}@|")
    else
        UPSTREAM_REPO="$REPO_URL"
    fi

    # Add or update the upstream remote
    if ! git remote get-url upstream > /dev/null 2>&1; then
        git remote add upstream "$UPSTREAM_REPO"
    else
        # Only update URL if we have an explicit override or token
        # This prevents clearing a manually-configured URL
        if [ -n "${TEMPLATE_UPSTREAM:-}" ] || [ -n "${TEMPLATE_ACCESS_TOKEN:-}" ]; then
            git remote set-url upstream "$UPSTREAM_REPO"
        fi
    fi
}

# =============================================================================
# Fetch upstream
# =============================================================================
fetch_upstream() {
    if [ "$MODE" != "auto" ]; then
        echo "Fetching upstream..."
    fi
    git fetch upstream "$UPSTREAM_BRANCH" --quiet 2>/dev/null || {
        echo "Warning: Could not fetch upstream. Skipping sync."
        exit 0
    }
}

# =============================================================================
# Read config from upstream (bootstrap)
# =============================================================================
read_upstream_config() {
    if ! git show "upstream/$UPSTREAM_BRANCH:$CONFIG_FILE" > "$TEMP_DIR/caps-sync.yml" 2>/dev/null; then
        if [ "$MODE" != "auto" ]; then
            echo "Note: $CONFIG_FILE not found in upstream. Using legacy full-merge behavior."
        fi
        return 1
    fi
    return 0
}

# =============================================================================
# Parse YAML config (simple implementation - BSD/GNU sed compatible)
# =============================================================================
parse_template_owned() {
    # Extract template_owned section (simple flat list)
    # Use [[:space:]] for BSD sed compatibility
    sed -n '/^template_owned:/,/^[a-z_]*:/p' "$TEMP_DIR/caps-sync.yml" | \
    grep '^[[:space:]]*-[[:space:]]' | \
    grep -v 'path:' | \
    sed 's/^[[:space:]]*-[[:space:]]*//' | \
    sed 's/[[:space:]]*#.*//' | \
    sed 's/^[[:space:]]*//' | \
    sed 's/[[:space:]]*$//'
}

parse_shared_files() {
    # Extract shared section paths
    sed -n '/^shared:/,/^[a-z_]*:/p' "$TEMP_DIR/caps-sync.yml" | \
    grep 'path:' | \
    sed 's/.*path:[[:space:]]*//' | \
    sed 's/^[[:space:]]*//' | \
    sed 's/[[:space:]]*$//'
}

get_shared_strategy() {
    local file="$1"
    # Find the strategy for a specific shared file
    sed -n '/^shared:/,/^[a-z_]*:/p' "$TEMP_DIR/caps-sync.yml" | \
    grep -A2 "path:[[:space:]]*$file" | \
    grep 'strategy:' | \
    sed 's/.*strategy:[[:space:]]*//' | \
    sed 's/^[[:space:]]*//' | \
    sed 's/[[:space:]]*$//'
}

get_shared_marker() {
    local file="$1"
    # Find the marker for section strategy
    sed -n '/^shared:/,/^[a-z_]*:/p' "$TEMP_DIR/caps-sync.yml" | \
    grep -A3 "path:[[:space:]]*$file" | \
    grep 'marker:' | \
    sed 's/.*marker:[[:space:]]*//' | \
    sed 's/"//g' | \
    sed 's/^[[:space:]]*//' | \
    sed 's/[[:space:]]*$//'
}

# =============================================================================
# Expand glob patterns to file list
# =============================================================================
# Converts glob patterns (like .claude/**) to a list of matching files from upstream.
#
# BUG FIX (PR #42): The sed commands must use a placeholder for ** conversion.
#
# WRONG (breaks): sed 's/\*\*/.*/g' | sed 's/\*/[^\/]*/g'
#   - First sed converts ** to .*
#   - Second sed then converts the * in .* to [^/]*, giving .[^/]* (WRONG!)
#
# CORRECT (use placeholder):
#   - First: ** → DOUBLESTAR
#   - Second: * → [^/]*
#   - Third: DOUBLESTAR → .*
#
# This ensures ** becomes .* and single * becomes [^/]* independently.
# =============================================================================
expand_glob_upstream() {
    local pattern="$1"
    # Convert glob to regex: ** -> .*, * -> [^/]*
    # CRITICAL: Use placeholder to avoid sed collision - see comment above
    local regex=$(echo "$pattern" | sed 's/\*\*/DOUBLESTAR/g' | sed 's/\*/[^\/]*/g' | sed 's/DOUBLESTAR/.*/g')
    git ls-tree -r --name-only "upstream/$UPSTREAM_BRANCH" 2>/dev/null | \
    grep -E "^$regex$" || true
}

expand_glob_local() {
    local pattern="$1"
    # Use find with glob pattern
    if [[ "$pattern" == *"**"* ]]; then
        # Recursive glob
        local base_dir=$(echo "$pattern" | sed 's/\*\*.*//')
        local suffix=$(echo "$pattern" | sed 's/.*\*\*//')
        if [ -d "$base_dir" ]; then
            find "$base_dir" -type f -name "*${suffix##/}" 2>/dev/null || true
        fi
    else
        # Simple glob
        ls -1 $pattern 2>/dev/null || true
    fi
}

# =============================================================================
# Sync a single file from upstream (overwrite)
# =============================================================================
sync_file_overwrite() {
    local file="$1"

    # Create parent directory if needed
    mkdir -p "$(dirname "$file")"

    # Checkout file from upstream
    git checkout "upstream/$UPSTREAM_BRANCH" -- "$file" 2>/dev/null || return 1
    return 0
}

# =============================================================================
# Shared file merge strategies
# =============================================================================

# ADDITIVE: Ensure template entries exist, preserve app additions
sync_additive() {
    local file="$1"

    # Get template version
    git show "upstream/$UPSTREAM_BRANCH:$file" > "$TEMP_DIR/template_file" 2>/dev/null || return 1

    if [ ! -f "$file" ]; then
        # File doesn't exist locally, create it
        cp "$TEMP_DIR/template_file" "$file"
        return 0
    fi

    # For .gitmodules: ensure all template submodules exist
    if [[ "$file" == ".gitmodules" ]]; then
        # Extract submodule names from template
        local template_submodules=$(grep '^\[submodule' "$TEMP_DIR/template_file" | sed 's/.*"\(.*\)".*/\1/')

        for submodule in $template_submodules; do
            if ! grep -q "\\[submodule \"$submodule\"\\]" "$file" 2>/dev/null; then
                # Submodule missing, append entire block
                echo "" >> "$file"
                # MACOS FIX (PR #52): Use 'sed $d' instead of 'head -n -1'
                # BSD head (macOS) doesn't support negative line counts
                sed -n "/\\[submodule \"$submodule\"\\]/,/^\\[/p" "$TEMP_DIR/template_file" | \
                sed '$d' >> "$file"
            fi
        done
    fi

    return 0
}

# SECTION: Template owns marked section, preserve rest
sync_section() {
    local file="$1"
    local marker="$2"

    # Get template version
    git show "upstream/$UPSTREAM_BRANCH:$file" > "$TEMP_DIR/template_file" 2>/dev/null || return 1

    if [ ! -f "$file" ]; then
        # File doesn't exist locally, create it
        cp "$TEMP_DIR/template_file" "$file"
        return 0
    fi

    # Recovery: Deduplicate if "## Project Overrides" appears multiple times
    # This fixes corruption from earlier macOS head -n -1 bug
    local po_marker="## Project Overrides"
    local po_count=$(grep -c "^$po_marker$" "$file" 2>/dev/null || echo "0")
    if [ "$po_count" -gt 1 ]; then
        echo "  [recovery] Detected $po_count duplicate '$po_marker' sections, deduplicating..." >&2
        # Keep: header + CAPS Base (before first PO) + last PO section (local's content)
        local first_po_line=$(grep -n "^$po_marker$" "$file" | head -1 | cut -d: -f1)
        local last_po_line=$(grep -n "^$po_marker$" "$file" | tail -1 | cut -d: -f1)
        if [ "$first_po_line" != "$last_po_line" ]; then
            # Get everything before first ## Project Overrides
            head -n $((first_po_line - 1)) "$file" > "$TEMP_DIR/deduped_file"
            # Append from last ## Project Overrides to end (the local content)
            tail -n +$last_po_line "$file" >> "$TEMP_DIR/deduped_file"
            cp "$TEMP_DIR/deduped_file" "$file"
        fi
    fi

    # Extract template's section (from marker to next ## or end)
    # MACOS FIX (PR #52): Use 'sed $d' instead of 'head -n -1'
    # BSD head (macOS) doesn't support negative line counts
    local template_section=$(sed -n "/$marker/,/^## [^C]/p" "$TEMP_DIR/template_file" | sed '$d')
    if [ -z "$template_section" ]; then
        # Marker to end of file
        template_section=$(sed -n "/$marker/,\$p" "$TEMP_DIR/template_file")
    fi

    if [ -z "$template_section" ]; then
        # No marker in template, skip
        return 0
    fi

    # Check if local file has the marker
    if grep -q "$marker" "$file"; then
        # Replace local section with template section
        # This is complex - use a temp file approach
        local before_marker=$(sed "/$marker/,\$d" "$file")
        local after_section=$(sed -n "/$marker/,/^## [^C]/p" "$file" | tail -n 1)
        if [[ "$after_section" == "## "* ]]; then
            local rest=$(sed -n "/^## [^C]/,\$p" "$file" | grep -v "^$marker" | head -1)
            rest=$(sed -n "/$rest/,\$p" "$file")
        else
            rest=""
        fi

        echo "$before_marker" > "$file"
        echo "$template_section" >> "$file"
        [ -n "$rest" ] && echo "$rest" >> "$file"
    else
        # No marker locally, prepend template section
        local original=$(cat "$file")
        echo "$template_section" > "$file"
        echo "" >> "$file"
        echo "$original" >> "$file"
    fi

    return 0
}

# DEEP_MERGE: Merge JSON objects, local wins on conflict
sync_deep_merge() {
    local file="$1"

    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo "Warning: jq not installed, skipping deep merge for $file"
        return 0
    fi

    # Get template version
    git show "upstream/$UPSTREAM_BRANCH:$file" > "$TEMP_DIR/template_file" 2>/dev/null || return 1

    if [ ! -f "$file" ]; then
        # File doesn't exist locally, create it
        cp "$TEMP_DIR/template_file" "$file"
        return 0
    fi

    # Deep merge: template * local (local wins)
    jq -s '.[0] * .[1]' "$TEMP_DIR/template_file" "$file" > "$TEMP_DIR/merged_file" 2>/dev/null || {
        echo "Warning: JSON merge failed for $file, keeping local version"
        return 0
    }

    cp "$TEMP_DIR/merged_file" "$file"
    return 0
}

# =============================================================================
# Main sync logic
# =============================================================================
do_sync() {
    local changed_files=()
    local deleted_files=()

    # -----------------------------------------------------
    # 1. Sync template_owned files (overwrite)
    # -----------------------------------------------------
    while IFS= read -r pattern; do
        [ -z "$pattern" ] && continue

        while IFS= read -r file; do
            [ -z "$file" ] && continue

            if [ "$MODE" = "check" ]; then
                # Check if file would change
                local upstream_hash=$(git rev-parse "upstream/$UPSTREAM_BRANCH:$file" 2>/dev/null || echo "")
                local local_hash=$(git hash-object "$file" 2>/dev/null || echo "none")
                if [ "$upstream_hash" != "$local_hash" ]; then
                    echo "  [overwrite] $file" >&2
                    changed_files+=("$file")
                fi
            else
                if sync_file_overwrite "$file"; then
                    changed_files+=("$file")
                fi
            fi
        done <<< "$(expand_glob_upstream "$pattern")"
    done <<< "$(parse_template_owned)"

    # -----------------------------------------------------
    # 2. Detect and handle deletions (template_owned only)
    # -----------------------------------------------------
    while IFS= read -r pattern; do
        [ -z "$pattern" ] && continue

        # Get local files matching pattern
        while IFS= read -r local_file; do
            [ -z "$local_file" ] && continue

            # Check if file exists in upstream
            if ! git cat-file -e "upstream/$UPSTREAM_BRANCH:$local_file" 2>/dev/null; then
                if [ "$MODE" = "check" ]; then
                    echo "  [delete] $local_file" >&2
                    deleted_files+=("$local_file")
                else
                    rm -f "$local_file"
                    deleted_files+=("$local_file")
                fi
            fi
        done <<< "$(expand_glob_local "$pattern")"
    done <<< "$(parse_template_owned)"

    # -----------------------------------------------------
    # 3. Sync shared files (merge strategies)
    # -----------------------------------------------------
    while IFS= read -r file; do
        [ -z "$file" ] && continue

        local strategy=$(get_shared_strategy "$file")

        if [ "$MODE" = "check" ]; then
            echo "  [merge:$strategy] $file" >&2
            changed_files+=("$file")
        else
            case "$strategy" in
                additive)
                    sync_additive "$file" && changed_files+=("$file")
                    ;;
                section)
                    local marker=$(get_shared_marker "$file")
                    sync_section "$file" "$marker" && changed_files+=("$file")
                    ;;
                deep_merge)
                    sync_deep_merge "$file" && changed_files+=("$file")
                    ;;
                *)
                    echo "Warning: Unknown strategy '$strategy' for $file"
                    ;;
            esac
        fi
    done <<< "$(parse_shared_files)"

    # Return results
    echo "${#changed_files[@]}:${#deleted_files[@]}"
}

# =============================================================================
# Legacy fallback (full merge)
# =============================================================================
do_legacy_merge() {
    if [ "$MODE" = "check" ]; then
        echo "Updates available from template:"
        git log --oneline HEAD..upstream/$UPSTREAM_BRANCH
        echo ""
        echo "Run '/update' to merge these changes."
        return
    fi

    echo "Merging upstream/$UPSTREAM_BRANCH..."
    if git merge upstream/$UPSTREAM_BRANCH --no-edit; then
        echo "Merge successful."
    else
        echo "CONFLICT: Merge conflicts detected."
        git diff --name-only --diff-filter=U
        exit 1
    fi
}

# =============================================================================
# Main execution
# =============================================================================
main() {
    setup_upstream
    fetch_upstream

    # Check for updates
    LOCAL_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "none")
    UPSTREAM_HEAD=$(git rev-parse "upstream/$UPSTREAM_BRANCH" 2>/dev/null || echo "none")

    if [ "$LOCAL_HEAD" = "$UPSTREAM_HEAD" ]; then
        [ "$MODE" != "auto" ] && echo "Already up to date with template."
        exit 0
    fi

    # Try to read config from upstream
    if ! read_upstream_config; then
        # Fallback to legacy merge
        do_legacy_merge
        exit 0
    fi

    # Show header
    if [ "$MODE" = "check" ]; then
        echo ""
        echo "Updates available from template:"
        git log --oneline HEAD..upstream/$UPSTREAM_BRANCH
        echo ""
        echo "Files that would be synced:"
    elif [ "$MODE" != "auto" ]; then
        echo ""
        echo "Syncing from template..."
    fi

    # Perform sync
    local result=$(do_sync)
    local changed_count=$(echo "$result" | cut -d: -f1)
    local deleted_count=$(echo "$result" | cut -d: -f2)

    if [ "$MODE" = "check" ]; then
        echo ""
        echo "Run '/update' to apply these changes."
        exit 0
    fi

    if [ "$MODE" = "auto" ]; then
        # Silent mode - just sync, no output or commit
        exit 0
    fi

    # Interactive mode - show status and offer to commit
    echo ""
    if [ "$changed_count" -gt 0 ] || [ "$deleted_count" -gt 0 ]; then
        echo "Sync complete: $changed_count files updated, $deleted_count files deleted."
        git status --short

        # Stage and commit
        git add -A
        if ! git diff --cached --quiet; then
            git commit -m "chore: sync from upstream CAPS template

Updated files from tob-webapp-stack template repository.
Managed by .caps-sync.yml ownership configuration."
            echo ""
            echo "Changes committed."
        fi
    else
        echo "No changes to sync."
    fi

    # Sync dependencies (keep existing behavior)
    if [ -f "pyproject.toml" ]; then
        echo "Syncing Python dependencies..."
        uv sync 2>/dev/null || true
    fi

    if [ -f "package.json" ]; then
        echo "Syncing Node dependencies..."
        npm install 2>/dev/null || true
    fi

    echo ""
    echo "Update complete."
}

main "$@"
