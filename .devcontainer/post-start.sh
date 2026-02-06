#!/usr/bin/env bash
set -euo pipefail

echo "🔄 TOB Claude Enablement - Session Start..."

# ============================================
# 1. Check for template updates
# ============================================
echo "📥 Checking for template updates..."
bash .claude/scripts/template-sync.sh --check 2>/dev/null || true

# ============================================
# 2. Update submodules
# ============================================
echo "📦 Updating submodules..."
git submodule update --init 2>/dev/null || true

# Re-apply sparse checkout for auto-claude
if [ -d "lib/auto-claude" ]; then
    cd lib/auto-claude
    git sparse-checkout set apps/backend 2>/dev/null || true
    cd ../..
fi

# ============================================
# 3. Authenticate GitHub CLI
# ============================================
echo "🔐 Authenticating GitHub CLI..."

# Source the gh auth setup script
source .devcontainer/gh-auth-setup.sh

if [ -n "$GH_TOKEN" ]; then
    # Verify authentication works
    if gh auth status &>/dev/null; then
        echo "   ✅ gh CLI authenticated"
    else
        echo "   ⚠️  gh CLI token found but authentication failed"
    fi
else
    echo "   ⚠️  No GitHub token found in git remote"
fi

# ============================================
# 4. Sync dependencies
# ============================================
# Note: auto-claude uses requirements.txt, not pyproject.toml
if [ -f "lib/auto-claude/apps/backend/requirements.txt" ]; then
    echo "🐍 Syncing auto-claude dependencies..."
    cd lib/auto-claude/apps/backend
    if [ -d ".venv" ]; then
        uv pip install -r requirements.txt --quiet 2>/dev/null || true
    else
        echo "   ⚠️  auto-claude venv missing - run post-create.sh or:"
        echo "      cd lib/auto-claude/apps/backend && uv venv --python 3.12 && uv pip install -r requirements.txt"
    fi
    cd ../../../..
fi

if [ -f "pyproject.toml" ]; then
    echo "🐍 Syncing project dependencies..."
    uv sync --frozen 2>/dev/null || uv sync 2>/dev/null || true
fi

if [ -f "package.json" ]; then
    echo "📦 Syncing Node.js dependencies..."
    npm ci --silent 2>/dev/null || npm install --silent 2>/dev/null || true
fi

# ============================================
# 5. Status
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Ready to code!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "$HOME/.claude" ] && [ "$(ls -A $HOME/.claude 2>/dev/null)" ]; then
    echo "🤖 Claude: authenticated"
else
    echo "🤖 Claude: not authenticated"
    echo "   → Open Claude Code panel in VS Code sidebar"
fi
echo ""
