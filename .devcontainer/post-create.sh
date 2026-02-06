#!/usr/bin/env bash
# =============================================================================
# post-create.sh - DevContainer initialization script
# =============================================================================
#
# CRITICAL: READ BEFORE MODIFYING AUTHENTICATION SECTIONS
# ========================================================
# This script sets up the development environment when a devcontainer is created.
# The authentication sections (2-4) are CRITICAL for upstream template access.
#
# IMPORTANT: The actual authentication for upstream template sync is handled by
# template-sync.sh using TOKEN-IN-URL. This file's credential helper setup is
# for OTHER git operations (like pushing to origin, creating PRs, etc).
#
# The template-sync.sh script embeds TEMPLATE_ACCESS_TOKEN directly in the URL
# because that's the ONLY method that works in Codespaces (see template-sync.sh
# header comments for detailed explanation).
#
# WARNING: Do not try to "improve" the upstream authentication by:
# - Making credential helpers the primary method (they don't work in Codespaces)
# - Removing token-in-URL from template-sync.sh (it's the ONLY working method)
# - Prioritizing SSH agent (unreliable, socket may not exist)
#
# See template-sync.sh header for full explanation of why credential helpers fail.
# =============================================================================

set -euo pipefail

echo "🚀 TOB Claude Enablement - Initial Setup..."

# ============================================
# 1. Fix volume permissions
# ============================================
if [ -d "/home/vscode/.claude" ]; then
    echo "🔐 Fixing Claude credentials permissions..."
    # Only attempt chown if vscode user exists
    if id vscode &>/dev/null; then
        chown -R vscode:vscode /home/vscode/.claude 2>/dev/null || true
    else
        echo "   ⚠️  vscode user not found, skipping permission fix"
    fi
fi

# ============================================
# 2. Detect authentication method for general git operations
# ============================================
# NOTE: This detection is for general git operations (push, PR creation, etc).
# For UPSTREAM TEMPLATE sync, template-sync.sh uses token-in-URL which is the
# ONLY method that works reliably in Codespaces.
#
# Priority for general git ops:
#   1. TEMPLATE_ACCESS_TOKEN (for template repo operations)
#   2. GITHUB_TOKEN (for current repo operations in Codespaces)
#   3. gh CLI token (if user ran gh auth login)
#   4. SSH keys (if manually mounted)
#   5. none (graceful degradation)
#
# NOTE: SSH agent detection removed because it's unreliable:
# - SSH_AUTH_SOCK may be set but socket may not exist
# - Causes silent failures that are hard to debug
# =============================================================================
echo "🔑 Detecting authentication method..."

AUTH_METHOD="none"
GIT_TOKEN=""

# Check for explicit tokens FIRST (most reliable in Codespaces)
if [ -n "${TEMPLATE_ACCESS_TOKEN:-}" ]; then
    GIT_TOKEN="$TEMPLATE_ACCESS_TOKEN"
    AUTH_METHOD="token"
    echo "   Found TEMPLATE_ACCESS_TOKEN"
elif [ -n "${GITHUB_TOKEN:-}" ]; then
    GIT_TOKEN="$GITHUB_TOKEN"
    AUTH_METHOD="token"
    echo "   Found GITHUB_TOKEN (Codespaces environment)"
fi

# If no token, try gh CLI
if [ "$AUTH_METHOD" = "none" ]; then
    if command -v gh &>/dev/null; then
        GIT_TOKEN=$(gh auth token 2>/dev/null || echo "")
        if [ -n "$GIT_TOKEN" ]; then
            AUTH_METHOD="token"
            echo "   Retrieved token from gh CLI"
        fi
    fi
fi

# Check for manually mounted SSH keys (optional mount at /home/vscode/.ssh-host)
if [ "$AUTH_METHOD" = "none" ] && [ -d "/home/vscode/.ssh-host" ]; then
    if [ -f "/home/vscode/.ssh-host/id_ed25519" ] || [ -f "/home/vscode/.ssh-host/id_rsa" ]; then
        mkdir -p /tmp/.ssh-fixed
        cp -r /home/vscode/.ssh-host/* /tmp/.ssh-fixed/ 2>/dev/null || true
        chmod 700 /tmp/.ssh-fixed
        chmod 600 /tmp/.ssh-fixed/id_* 2>/dev/null || true
        chmod 644 /tmp/.ssh-fixed/*.pub 2>/dev/null || true
        export GIT_SSH_COMMAND="ssh -i /tmp/.ssh-fixed/id_ed25519 -i /tmp/.ssh-fixed/id_rsa -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new 2>/dev/null"
        AUTH_METHOD="ssh"
        echo "   SSH keys prepared from manual mount (/home/vscode/.ssh-host)"
    fi
fi

if [ "$AUTH_METHOD" = "none" ]; then
    echo "   ⚠️  No authentication method available"
    echo "   Git operations requiring auth will fail"
fi

# ============================================
# 3. Configure git credential helper (for general HTTPS operations)
# ============================================
# NOTE: This credential helper is for GENERAL git operations (push, clone, etc).
# It does NOT work for upstream template sync in Codespaces because the system
# credential helper takes precedence. template-sync.sh uses token-in-URL instead.
# =============================================================================
if [ "$AUTH_METHOD" = "token" ] && [ -n "$GIT_TOKEN" ]; then
    echo "🔧 Configuring git credential helper..."
    git config --global credential.helper "!f() { echo username=x-access-token; echo password=${GIT_TOKEN}; }; f"
    echo "   Git configured for HTTPS authentication"
fi

# ============================================
# 4. Set up upstream remote to template repo
# ============================================
# NOTE: The upstream remote URL configured here is just a placeholder.
# template-sync.sh will OVERRIDE this with a token-embedded URL when it runs.
# This is intentional - see template-sync.sh header for why token-in-URL is required.
# =============================================================================
echo "🔗 Configuring upstream remote..."

# Use HTTPS URL - template-sync.sh will add the token when it runs
UPSTREAM_URL="${TEMPLATE_UPSTREAM:-https://github.com/the-original-body/tob-webapp-stack.git}"

# Add or update upstream remote (template-sync.sh will add token when needed)
if ! git remote get-url upstream &>/dev/null; then
    git remote add upstream "$UPSTREAM_URL"
    echo "   Added upstream: $UPSTREAM_URL"
else
    echo "   Upstream already configured"
fi

# Don't try to fetch here - let template-sync.sh handle it with proper auth
echo "   (Upstream fetch will happen during template sync)"

# ============================================
# 5. Initial template sync
# ============================================
# Only sync if we have authentication and haven't synced before
if [ "$AUTH_METHOD" != "none" ]; then
    if ! git log --oneline 2>/dev/null | head -20 | grep -qE "(sync from upstream|Merge remote-tracking branch 'upstream/)"; then
        echo "🔄 Syncing CAPS template files..."
        if [ -f ".claude/scripts/template-sync.sh" ]; then
            # Export auth method for template-sync.sh
            export AUTH_METHOD GIT_TOKEN GIT_SSH_COMMAND
            bash .claude/scripts/template-sync.sh --auto || {
                echo "   ⚠️  Initial sync completed with warnings - this is normal for new repos"
            }
            echo "   CAPS template files synced"
        fi
    else
        echo "🔄 Template already synced, skipping initial sync"
    fi
else
    echo "⚠️  Skipping template sync (no authentication available)"
fi

# ============================================
# 6. Initialize submodules
# ============================================
echo "📦 Initializing submodules..."

# Try standard submodule init first
git submodule update --init 2>/dev/null || true

# Handle template repo case: .gitmodules exists but gitlink entries are missing
# When creating from GitHub template, .gitmodules is copied but submodule refs are not
if [ -f ".gitmodules" ]; then
    SUBMODULE_PATH="lib/auto-claude"
    if [ ! -d "$SUBMODULE_PATH/.git" ] && ! git -C "$SUBMODULE_PATH" rev-parse --git-dir &>/dev/null 2>&1; then
        echo "   Template repo detected - adding submodule from scratch..."
        # Remove empty placeholder directory if it exists
        rm -rf "$SUBMODULE_PATH" 2>/dev/null || true
        # Extract URL from .gitmodules and add submodule properly
        SUBMODULE_URL=$(git config -f .gitmodules submodule."$SUBMODULE_PATH".url 2>/dev/null || echo "")
        if [ -n "$SUBMODULE_URL" ]; then
            # Convert URL to SSH if using SSH auth
            if [ "$AUTH_METHOD" = "ssh-agent" ] || [ "$AUTH_METHOD" = "ssh" ]; then
                SUBMODULE_URL=$(echo "$SUBMODULE_URL" | sed 's|https://github.com/|git@github.com:|')
            fi
            git submodule add "$SUBMODULE_URL" "$SUBMODULE_PATH" 2>/dev/null || echo "   ⚠️  Failed to add auto-claude submodule"
        fi
    fi
fi

# ============================================
# 7. Configure sparse checkout for auto-claude (backend only)
# ============================================
if [ -d "lib/auto-claude" ] && git -C lib/auto-claude rev-parse --git-dir &>/dev/null 2>&1; then
    echo "🎯 Configuring auto-claude sparse checkout (backend only)..."
    cd lib/auto-claude
    git sparse-checkout init --cone 2>/dev/null || true
    git sparse-checkout set apps/backend 2>/dev/null || true
    cd ../..
else
    echo "⚠️  auto-claude submodule not initialized, skipping sparse checkout"
fi

# ============================================
# 8. Install Python dependencies with uv
# ============================================
# Note: auto-claude uses requirements.txt, not pyproject.toml
if [ -f "lib/auto-claude/apps/backend/requirements.txt" ]; then
    echo "🐍 Installing auto-claude Python dependencies..."
    cd lib/auto-claude/apps/backend || {
        echo "   ⚠️  Failed to cd to auto-claude backend"
        continue
    }
    uv venv --python 3.12 2>/dev/null || true  # Requires 3.12+ for memory features
    uv pip install -r requirements.txt 2>/dev/null || true
    cd ../../../.. || true
fi

if [ -f "pyproject.toml" ]; then
    echo "🐍 Installing project Python dependencies..."
    uv sync --frozen 2>/dev/null || uv sync 2>/dev/null || true
fi

# ============================================
# 9. Install Node.js dependencies
# ============================================
if [ -f "package.json" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# ============================================
# 10. Configure GitHub CLI default repository
# ============================================
echo "🔗 Configuring GitHub CLI default repository..."
# Extract owner/repo from git remote URL (handles both https and ssh formats)
GIT_ORIGIN_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
GIT_ORIGIN=$(echo "$GIT_ORIGIN_URL" | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')
if [ -n "$GIT_ORIGIN" ]; then
    gh repo set-default "$GIT_ORIGIN" 2>/dev/null || true
    echo "   Default repo set to: $GIT_ORIGIN"
else
    echo "   ⚠️  Could not determine origin repo"
fi

# ============================================
# 11. Ensure gh CLI is authenticated (for gh commands, not just git)
# ============================================
echo "🔐 Configuring gh CLI authentication..."
if ! gh auth status &>/dev/null; then
    if [ -n "$GIT_TOKEN" ]; then
        echo "$GIT_TOKEN" | gh auth login --with-token 2>/dev/null && \
            echo "   Authenticated gh CLI with available token" || \
            echo "   ⚠️  Failed to authenticate gh CLI"
    else
        echo "   ⚠️  gh CLI not authenticated (run 'gh auth login' manually if needed)"
    fi
else
    echo "   gh CLI already authenticated"
fi

# ============================================
# 12. Set up GH_TOKEN in shell profile
# ============================================
echo "🔧 Configuring GH_TOKEN for interactive shells..."
if ! grep -q "gh-auth-setup.sh" /home/vscode/.bashrc 2>/dev/null; then
    cat >> /home/vscode/.bashrc << 'EOF'

# Auto-configure GH_TOKEN from git remote
if [ -f /workspaces/$(basename $(pwd))/.devcontainer/gh-auth-setup.sh ]; then
    source /workspaces/$(basename $(pwd))/.devcontainer/gh-auth-setup.sh 2>/dev/null
fi
EOF
    echo "   Added GH_TOKEN setup to .bashrc"
else
    echo "   GH_TOKEN setup already in .bashrc"
fi

# ============================================
# 12. Configure gh CLI wrapper (deprecated - moved to bash function)
# ============================================
# NOTE: The sudo-based binary wrapper has been removed in favor of a bash function
# approach that doesn't require sudo privileges. The bash function wrapper is added
# to .bashrc during the GH_TOKEN setup step (Section 11) and provides the same
# functionality without modifying system binaries.
#
# See issue #159 for the proposed upstream solution using a sudoer-compatible approach.
echo "🔧 gh CLI wrapper configured via bash function (see Section 11)"

# ============================================
# 13. Verify installation
# ============================================
echo ""
if [ -f ".claude/scripts/test-setup.sh" ]; then
    bash .claude/scripts/test-setup.sh
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Setup complete!"
    echo ""
    echo "Authentication method: $AUTH_METHOD"
    if [ "$AUTH_METHOD" = "ssh-agent" ]; then
        echo "Git operations will use SSH (via forwarded agent)"
    elif [ "$AUTH_METHOD" = "ssh" ]; then
        echo "Git operations will use SSH (via mounted keys)"
    elif [ "$AUTH_METHOD" = "token" ]; then
        echo "Git operations will use HTTPS with token"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
echo ""
echo "📝 Next: Open Claude Code panel in VS Code sidebar to authenticate"
echo ""
