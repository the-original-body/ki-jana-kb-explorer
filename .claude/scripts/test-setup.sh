#!/bin/bash
# test-setup.sh - Verify setup and update functionality
# Run this after Codespace creation or to diagnose issues

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; FAILED=1; }
warn() { echo -e "${YELLOW}!${NC} $1"; }

FAILED=0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup & Update Functionality Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================
# 1. Git remotes
# ============================================
echo "1. Git Remotes"
if git remote get-url origin &>/dev/null; then
    pass "origin remote configured: $(git remote get-url origin)"
else
    fail "origin remote not configured"
fi

if git remote get-url upstream &>/dev/null; then
    pass "upstream remote configured: $(git remote get-url upstream)"
else
    fail "upstream remote not configured (run post-create.sh or add manually)"
fi
echo ""

# ============================================
# 2. Submodules
# ============================================
echo "2. Submodules"
if [ -f ".gitmodules" ]; then
    pass ".gitmodules exists"
else
    warn ".gitmodules not found (no submodules configured)"
fi

if [ -d "lib/auto-claude/.git" ] || [ -f "lib/auto-claude/.git" ]; then
    pass "auto-claude submodule initialized"

    if [ -d "lib/auto-claude/apps/backend" ]; then
        pass "sparse checkout configured (apps/backend exists)"
    else
        fail "sparse checkout not configured (apps/backend missing)"
    fi
else
    fail "auto-claude submodule not initialized (run: git submodule update --init)"
fi
echo ""

# ============================================
# 3. Claude Code
# ============================================
echo "3. Claude Code"
if command -v claude &>/dev/null; then
    pass "claude CLI installed: $(claude --version 2>/dev/null || echo 'version unknown')"
else
    warn "claude CLI not found (expected in Codespaces with Claude feature)"
fi

if [ -d "$HOME/.claude" ]; then
    if [ -w "$HOME/.claude" ]; then
        pass "$HOME/.claude exists and is writable"
    else
        fail "$HOME/.claude exists but is NOT writable (permission issue)"
    fi
else
    warn "$HOME/.claude does not exist (will be created on first use)"
fi
echo ""

# ============================================
# 4. Template sync script
# ============================================
echo "4. Template Sync"
if [ -f ".claude/scripts/template-sync.sh" ]; then
    pass "template-sync.sh exists"

    echo "   Running --check mode..."
    if bash .claude/scripts/template-sync.sh --check 2>&1 | head -5 | sed 's/^/   /'; then
        pass "template-sync.sh --check works"
    else
        fail "template-sync.sh --check failed"
    fi
else
    fail "template-sync.sh not found"
fi
echo ""

# ============================================
# 5. Dependencies
# ============================================
echo "5. Dependencies"
if command -v node &>/dev/null; then
    pass "Node.js: $(node --version)"
else
    warn "Node.js not found"
fi

if command -v uv &>/dev/null; then
    pass "uv: $(uv --version 2>/dev/null || echo 'installed')"
else
    warn "uv not found"
fi

if command -v gh &>/dev/null; then
    pass "GitHub CLI: $(gh --version | head -1)"
else
    warn "GitHub CLI not found"
fi
echo ""

# ============================================
# 6. Installed Dependencies
# ============================================
echo "6. Installed Dependencies"

# Node modules
if [ -f "package.json" ]; then
    if [ -d "node_modules" ]; then
        pass "node_modules installed"
    else
        fail "node_modules missing (run: npm install)"
    fi
else
    warn "No package.json (Node deps not applicable)"
fi

# Python venv - project level
if [ -f "pyproject.toml" ]; then
    if [ -d ".venv" ]; then
        pass "Project .venv exists"
    else
        fail "Project .venv missing (run: uv sync)"
    fi
else
    warn "No pyproject.toml (Python deps not applicable)"
fi

# Python venv - auto-claude (uses requirements.txt, not pyproject.toml)
if [ -f "lib/auto-claude/apps/backend/requirements.txt" ]; then
    if [ -d "lib/auto-claude/apps/backend/.venv" ]; then
        pass "auto-claude .venv exists"
        # Verify Python version is 3.12+ (required for memory features)
        PYVER=$(lib/auto-claude/apps/backend/.venv/bin/python --version 2>/dev/null | grep -oP '\d+\.\d+' | head -1)
        if [ -n "$PYVER" ]; then
            MAJOR=$(echo "$PYVER" | cut -d. -f1)
            MINOR=$(echo "$PYVER" | cut -d. -f2)
            if [ "$MAJOR" -gt 3 ] || { [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 12 ]; }; then
                pass "auto-claude Python version: $PYVER (3.12+ required)"
            else
                fail "auto-claude Python version $PYVER < 3.12 (memory features require 3.12+)"
            fi
        else
            warn "Could not determine auto-claude Python version"
        fi
    else
        fail "auto-claude .venv missing (run: cd lib/auto-claude/apps/backend && uv venv --python 3.12 && uv pip install -r requirements.txt)"
    fi
fi
echo ""

# ============================================
# 7. Environment Variables
# ============================================
echo "7. Environment Variables"

if [ -n "$UV_PROJECT_ENVIRONMENT" ]; then
    pass "UV_PROJECT_ENVIRONMENT: $UV_PROJECT_ENVIRONMENT"
else
    warn "UV_PROJECT_ENVIRONMENT not set"
fi

if [ -n "$UV_LINK_MODE" ]; then
    pass "UV_LINK_MODE: $UV_LINK_MODE"
else
    warn "UV_LINK_MODE not set"
fi

if [ -n "$TEMPLATE_UPSTREAM" ]; then
    pass "TEMPLATE_UPSTREAM: $TEMPLATE_UPSTREAM"
else
    warn "TEMPLATE_UPSTREAM not set (will use default)"
fi
echo ""

# ============================================
# 8. GitHub CLI Configuration
# ============================================
echo "8. GitHub CLI Configuration"
if command -v gh &>/dev/null; then
    GH_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
    # Extract owner/repo from git remote URL (handles both https and ssh formats)
    GIT_ORIGIN_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
    GIT_ORIGIN=$(echo "$GIT_ORIGIN_URL" | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')
    if [ -n "$GH_REPO" ]; then
        if [ "$GH_REPO" = "$GIT_ORIGIN" ]; then
            pass "GitHub CLI default repo matches origin: $GH_REPO"
        else
            warn "GitHub CLI default repo ($GH_REPO) differs from origin ($GIT_ORIGIN)"
            echo "      Run: gh repo set-default $GIT_ORIGIN"
        fi
    else
        warn "GitHub CLI default repo not set (run: gh repo set-default)"
    fi
else
    warn "GitHub CLI not installed, skipping repo check"
fi
echo ""

# ============================================
# Summary
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
else
    echo -e "${RED}Some checks failed. See above for details.${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $FAILED
