#!/usr/bin/env bash
set -euo pipefail

# setup-host.sh - One-time host setup for devcontainer development
#
# Run this after cloning the repo:
#   ./setup-host.sh
#
# What it does:
#   1. Installs devcontainer CLI (if missing)
#   2. Starts Docker Desktop (if not running)
#   3. Adds devup/devsh aliases to your shell config
#   4. Builds and starts the devcontainer (uses gh token if available)
#
# After setup, use:
#   devup  - First terminal (starts Docker + container + shell)
#   devsh  - Additional terminals (instant shell into running container)

echo "🚀 Setting up host for devcontainer development..."
echo ""

# ============================================
# 1. Check prerequisites
# ============================================
echo "📋 Checking prerequisites..."

# Check for npm (needed to install devcontainer CLI)
if ! command -v npm &>/dev/null; then
    echo "❌ npm not found. Please install Node.js first:"
    echo "   https://nodejs.org/ or use: brew install node"
    exit 1
fi
echo "   ✓ npm found"

# Check for Docker Desktop
if ! command -v docker &>/dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop first:"
    echo "   https://www.docker.com/products/docker-desktop/"
    exit 1
fi
echo "   ✓ Docker found"

# ============================================
# 2. Install devcontainer CLI
# ============================================
echo ""
echo "📦 Checking devcontainer CLI..."

if ! command -v devcontainer &>/dev/null; then
    echo "   Installing devcontainer CLI..."
    npm install -g @devcontainers/cli
    echo "   ✓ devcontainer CLI installed"
else
    echo "   ✓ devcontainer CLI already installed"
fi

# ============================================
# 3. Start Docker Desktop
# ============================================
echo ""
echo "🐳 Checking Docker Desktop..."

if ! docker info &>/dev/null; then
    echo "   Starting Docker Desktop..."
    open -a Docker

    # Wait for Docker to be ready (max 60 seconds)
    echo "   Waiting for Docker to start..."
    timeout=60
    while ! docker info &>/dev/null; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            echo "❌ Docker failed to start within 60 seconds"
            exit 1
        fi
    done
    echo "   ✓ Docker Desktop started"
else
    echo "   ✓ Docker Desktop already running"
fi

# ============================================
# 4. Add shell aliases
# ============================================
echo ""
echo "🔧 Configuring shell aliases..."

# Determine shell config file
if [ -n "${ZSH_VERSION:-}" ] || [ "$SHELL" = "/bin/zsh" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -n "${BASH_VERSION:-}" ] || [ "$SHELL" = "/bin/bash" ]; then
    SHELL_RC="$HOME/.bashrc"
else
    SHELL_RC="$HOME/.zshrc"  # Default to zsh on macOS
fi

# Define the aliases block
ALIASES_BLOCK='# Devcontainer aliases (added by setup-host.sh)
# devup  - First terminal: starts Docker + container + shell
# devsh  - Additional terminals: instant shell into running container
alias devup='"'"'(docker info >/dev/null 2>&1 || (open -a Docker && echo "Starting Docker..." && while ! docker info >/dev/null 2>&1; do sleep 1; done)) && devcontainer up --workspace-folder . && devcontainer exec --workspace-folder . bash'"'"'
alias devsh='"'"'devcontainer exec --workspace-folder . bash'"'"''

# Check if aliases already exist
if grep -q "alias devup=" "$SHELL_RC" 2>/dev/null; then
    echo "   ✓ Aliases already configured in $SHELL_RC"
else
    echo "" >> "$SHELL_RC"
    echo "$ALIASES_BLOCK" >> "$SHELL_RC"
    echo "   ✓ Added aliases to $SHELL_RC"
fi

# ============================================
# 5. Build and start the container
# ============================================
# Get token from gh CLI if available (devcontainer CLI doesn't forward SSH agent)
if [ -z "${TEMPLATE_ACCESS_TOKEN:-}" ] && command -v gh &>/dev/null; then
    export TEMPLATE_ACCESS_TOKEN=$(gh auth token 2>/dev/null || echo "")
fi
echo ""
echo "🏗️  Building devcontainer (this may take a few minutes on first run)..."

devcontainer up --workspace-folder .

# ============================================
# Done!
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo ""
echo "To start using the devcontainer:"
echo ""
echo "  1. Open a new terminal (or run: source $SHELL_RC)"
echo "  2. Navigate to this project directory"
echo "  3. Run: devsh"
echo ""
echo "Commands:"
echo "  devup  - Start everything (use if container stopped)"
echo "  devsh  - Open shell in running container"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
