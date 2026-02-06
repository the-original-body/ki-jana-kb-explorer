#!/bin/bash
# test-template-sync.sh - Comprehensive test suite for safe template sync
#
# This script tests all aspects of the template-sync.sh functionality:
# - Template owned files (overwrite behavior)
# - Shared files (additive, section, deep_merge strategies)
# - App owned files (never touched)
# - Deletion tracking
# - Check mode (dry-run)
# - Auto mode (silent sync)
#
# Usage: bash .claude/scripts/test-template-sync.sh

set -e

# =============================================================================
# Test Configuration
# =============================================================================
TEST_DIR=$(mktemp -d)
UPSTREAM_DIR="$TEST_DIR/upstream"
DOWNSTREAM_DIR="$TEST_DIR/downstream"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# =============================================================================
# Test Utilities
# =============================================================================
cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
    ((TESTS_RUN++))
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

assert_file_exists() {
    if [ -f "$1" ]; then
        log_pass "File exists: $1"
    else
        log_fail "File missing: $1"
    fi
}

assert_file_not_exists() {
    if [ ! -f "$1" ]; then
        log_pass "File correctly absent: $1"
    else
        log_fail "File should not exist: $1"
    fi
}

assert_file_contains() {
    if grep -q "$2" "$1" 2>/dev/null; then
        log_pass "File $1 contains: $2"
    else
        log_fail "File $1 missing content: $2"
    fi
}

assert_file_not_contains() {
    if ! grep -q "$2" "$1" 2>/dev/null; then
        log_pass "File $1 correctly lacks: $2"
    else
        log_fail "File $1 should not contain: $2"
    fi
}

assert_file_equals() {
    local expected="$2"
    local actual=$(cat "$1" 2>/dev/null)
    if [ "$actual" = "$expected" ]; then
        log_pass "File $1 has expected content"
    else
        log_fail "File $1 content mismatch"
        echo "  Expected: $expected"
        echo "  Actual: $actual"
    fi
}

# =============================================================================
# Setup Functions
# =============================================================================
setup_upstream_repo() {
    log_info "Setting up upstream (template) repository..."

    mkdir -p "$UPSTREAM_DIR"
    (
        cd "$UPSTREAM_DIR"
        git init --quiet
        git config user.email "test@test.com"
        git config user.name "Test"

        # Create .caps-sync.yml
        mkdir -p .claude/commands .claude/scripts .claude/skills
        cat > .caps-sync.yml << 'EOF'
version: 1

template_owned:
  - .claude/commands/**
  - .claude/scripts/**
  - .claude/skills/**
  - .claude/settings.json
  - .caps-sync.yml

shared:
  - path: .gitmodules
    strategy: additive
  - path: CLAUDE.md
    strategy: section
    marker: "## CAPS Base"
  - path: .devcontainer/devcontainer.json
    strategy: deep_merge

app_owned:
  - src/**
  - README.md
  - package.json
  - wrangler.toml
EOF

        # Create template-owned files
        echo "# Build Command v1" > .claude/commands/build.md
        echo "# Design Command v1" > .claude/commands/design.md
        echo '{"permissions": {"allow": ["Read"]}}' > .claude/settings.json

        # Create shared files
        cat > .gitmodules << 'EOF'
[submodule "lib/auto-claude"]
	path = lib/auto-claude
	url = https://github.com/example/auto-claude.git
EOF

        cat > CLAUDE.md << 'EOF'
# Project Instructions

## CAPS Base

This is the CAPS base content.
It should be synced from template.

### TIDE Workflow
Follow the TIDE workflow.

## Project Overrides

Add your overrides here.
EOF

        mkdir -p .devcontainer
        cat > .devcontainer/devcontainer.json << 'EOF'
{
  "name": "CAPS Template",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {}
  },
  "postCreateCommand": "echo 'setup'"
}
EOF

        # Copy the actual template-sync.sh script
        cp "$SCRIPT_DIR/template-sync.sh" .claude/scripts/template-sync.sh

        git add -A
        git commit -m "Initial upstream commit" --quiet
    )
}

setup_downstream_repo() {
    log_info "Setting up downstream (app) repository..."

    mkdir -p "$DOWNSTREAM_DIR"
    (
        cd "$DOWNSTREAM_DIR"
        git init --quiet
        git config user.email "test@test.com"
        git config user.name "Test"

        # Create initial downstream content
        mkdir -p src .claude/commands .devcontainer

        # App-owned files (should never be touched)
        echo "console.log('my app');" > src/app.js
        echo "# My Project" > README.md
        echo '{"name": "my-app"}' > package.json
        echo 'name = "my-app"' > wrangler.toml

        # Downstream version of shared files
        cat > .gitmodules << 'EOF'
[submodule "lib/auto-claude"]
	path = lib/auto-claude
	url = https://github.com/example/auto-claude.git
[submodule "lib/my-custom-lib"]
	path = lib/my-custom-lib
	url = https://github.com/example/my-lib.git
EOF

        cat > CLAUDE.md << 'EOF'
# Project Instructions

## CAPS Base

Old CAPS content that should be replaced.

## Project Overrides

My custom project instructions.
These should be preserved!

## My Custom Section

This is my own section.
EOF

        cat > .devcontainer/devcontainer.json << 'EOF'
{
  "name": "My Custom Name",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "forwardPorts": [3000, 8080],
  "customizations": {
    "vscode": {
      "extensions": ["my.extension"]
    }
  }
}
EOF

        # Old template-owned files (should be overwritten)
        echo "# Old Build Command" > .claude/commands/build.md
        echo '{"permissions": {"allow": []}}' > .claude/settings.json

        # File that will be deleted (exists locally but not in upstream)
        echo "# Old command to delete" > .claude/commands/old-command.md

        git add -A
        git commit -m "Initial downstream commit" --quiet

        # Add upstream remote
        git remote add upstream "$UPSTREAM_DIR"
        git fetch upstream --quiet
    )
}

# =============================================================================
# Test Cases
# =============================================================================

test_check_mode() {
    log_test "Check mode (--check) shows changes without applying"

    log_info "DOWNSTREAM_DIR=$DOWNSTREAM_DIR"
    log_info "TEMPLATE_UPSTREAM=$TEMPLATE_UPSTREAM"

    # Run in check mode and capture output to a file
    local output_file="$TEST_DIR/check_output.txt"
    log_info "Running: cd $DOWNSTREAM_DIR && bash .claude/scripts/template-sync.sh --check"

    # Use timeout if available, otherwise just run
    if command -v gtimeout &> /dev/null; then
        gtimeout 30 bash -c "cd '$DOWNSTREAM_DIR' && bash .claude/scripts/template-sync.sh --check" > "$output_file" 2>&1 || true
    else
        bash -c "cd '$DOWNSTREAM_DIR' && bash .claude/scripts/template-sync.sh --check" > "$output_file" 2>&1 || true
    fi

    log_info "Check mode completed"
    log_info "Output: $(cat $output_file)"

    # Verify output mentions files
    if grep -q "overwrite\|merge\|delete" "$output_file"; then
        log_pass "Check mode shows pending changes"
    else
        log_fail "Check mode should show pending changes"
    fi

    # Verify no actual changes were made
    if (cd "$DOWNSTREAM_DIR" && git diff --quiet); then
        log_pass "Check mode made no changes"
    else
        log_fail "Check mode should not modify files"
        (cd "$DOWNSTREAM_DIR" && git checkout -- . 2>/dev/null)
    fi
}

test_template_owned_overwrite() {
    log_test "Template-owned files are overwritten"

    # Run sync
    (cd "$DOWNSTREAM_DIR" && bash .claude/scripts/template-sync.sh --auto 2>/dev/null) || true

    # Check that template-owned files match upstream
    assert_file_contains "$DOWNSTREAM_DIR/.claude/commands/build.md" "Build Command v1"
    assert_file_contains "$DOWNSTREAM_DIR/.claude/settings.json" '"allow": \["Read"\]'
}

test_template_owned_new_files() {
    log_test "New template-owned files are created"

    # design.md should be created (exists in upstream, not in downstream)
    assert_file_exists "$DOWNSTREAM_DIR/.claude/commands/design.md"
    assert_file_contains "$DOWNSTREAM_DIR/.claude/commands/design.md" "Design Command v1"
}

test_template_owned_deletion() {
    log_test "Deleted template-owned files are removed"

    # old-command.md should be deleted (exists locally but not in upstream)
    assert_file_not_exists "$DOWNSTREAM_DIR/.claude/commands/old-command.md"
}

test_shared_additive_gitmodules() {
    log_test "Shared file (.gitmodules) uses additive strategy"

    # Should have template's submodule
    assert_file_contains "$DOWNSTREAM_DIR/.gitmodules" 'submodule "lib/auto-claude"'

    # Should preserve downstream's custom submodule
    assert_file_contains "$DOWNSTREAM_DIR/.gitmodules" 'submodule "lib/my-custom-lib"'
}

test_shared_section_claude_md() {
    log_test "Shared file (CLAUDE.md) uses section strategy"

    # Should have updated CAPS Base section
    assert_file_contains "$DOWNSTREAM_DIR/CLAUDE.md" "This is the CAPS base content"
    assert_file_contains "$DOWNSTREAM_DIR/CLAUDE.md" "TIDE Workflow"

    # Should preserve downstream's custom sections
    assert_file_contains "$DOWNSTREAM_DIR/CLAUDE.md" "My custom project instructions"
    assert_file_contains "$DOWNSTREAM_DIR/CLAUDE.md" "My Custom Section"
}

test_shared_deep_merge_devcontainer() {
    log_test "Shared file (devcontainer.json) uses deep_merge strategy"

    # Should have template's features
    assert_file_contains "$DOWNSTREAM_DIR/.devcontainer/devcontainer.json" "ghcr.io/devcontainers/features/node"

    # Should preserve downstream's custom name (local wins)
    assert_file_contains "$DOWNSTREAM_DIR/.devcontainer/devcontainer.json" "My Custom Name"

    # Should preserve downstream's custom ports
    assert_file_contains "$DOWNSTREAM_DIR/.devcontainer/devcontainer.json" "3000"

    # Should preserve downstream's extensions
    assert_file_contains "$DOWNSTREAM_DIR/.devcontainer/devcontainer.json" "my.extension"
}

test_app_owned_untouched() {
    log_test "App-owned files are never touched"

    # Verify app files are unchanged
    assert_file_contains "$DOWNSTREAM_DIR/src/app.js" "console.log('my app')"
    assert_file_contains "$DOWNSTREAM_DIR/README.md" "# My Project"
    assert_file_contains "$DOWNSTREAM_DIR/package.json" '"name": "my-app"'
    assert_file_contains "$DOWNSTREAM_DIR/wrangler.toml" 'name = "my-app"'
}

test_auto_mode_no_commit() {
    log_test "Auto mode (--auto) syncs without committing"

    # Reset downstream for this test
    (
        cd "$DOWNSTREAM_DIR"
        git reset --hard HEAD~1 2>/dev/null || git reset --hard HEAD
        git checkout -- . 2>/dev/null || true
        git clean -fd 2>/dev/null || true

        # Re-create test files
        mkdir -p .claude/commands
        echo "# Old Build Command" > .claude/commands/build.md
        git add -A
        git commit -m "Reset for auto mode test" --quiet
    )

    local commit_before=$(cd "$DOWNSTREAM_DIR" && git rev-parse HEAD)

    # Run in auto mode
    (cd "$DOWNSTREAM_DIR" && bash .claude/scripts/template-sync.sh --auto 2>/dev/null) || true

    local commit_after=$(cd "$DOWNSTREAM_DIR" && git rev-parse HEAD)

    # Verify files changed but no commit was made
    if [ "$commit_before" = "$commit_after" ]; then
        log_pass "Auto mode did not create a commit"
    else
        log_fail "Auto mode should not create commits"
    fi

    # Verify changes were applied
    if grep -q "Build Command v1" "$DOWNSTREAM_DIR/.claude/commands/build.md" 2>/dev/null; then
        log_pass "Auto mode applied changes"
    else
        log_fail "Auto mode should apply changes"
    fi
}

test_upstream_update_propagates() {
    log_test "Upstream updates propagate on subsequent sync"

    # Update upstream
    (
        cd "$UPSTREAM_DIR"
        echo "# Build Command v2 - Updated!" > .claude/commands/build.md
        git add -A
        git commit -m "Update build command" --quiet
    )

    # Sync downstream
    (
        cd "$DOWNSTREAM_DIR"
        git fetch upstream --quiet
        bash .claude/scripts/template-sync.sh --auto 2>/dev/null || true
    )

    # Verify update propagated
    assert_file_contains "$DOWNSTREAM_DIR/.claude/commands/build.md" "Build Command v2"
}

test_new_template_file_added() {
    log_test "New files added to upstream are synced"

    # Add new file to upstream
    (
        cd "$UPSTREAM_DIR"
        mkdir -p .claude/skills
        echo "# New Skill" > .claude/skills/new-skill.md
        git add -A
        git commit -m "Add new skill" --quiet
    )

    # Sync downstream
    (
        cd "$DOWNSTREAM_DIR"
        git fetch upstream --quiet
        bash .claude/scripts/template-sync.sh --auto 2>/dev/null || true
    )

    # Verify new file was created
    assert_file_exists "$DOWNSTREAM_DIR/.claude/skills/new-skill.md"
    assert_file_contains "$DOWNSTREAM_DIR/.claude/skills/new-skill.md" "New Skill"
}

test_deleted_template_file_removed() {
    log_test "Files deleted from upstream are removed locally"

    # Delete file from upstream
    (
        cd "$UPSTREAM_DIR"
        rm -f .claude/commands/design.md
        git add -A
        git commit -m "Remove design command" --quiet
    )

    # Sync downstream
    (
        cd "$DOWNSTREAM_DIR"
        git fetch upstream --quiet
        bash .claude/scripts/template-sync.sh --auto 2>/dev/null || true
    )

    # Verify file was deleted
    assert_file_not_exists "$DOWNSTREAM_DIR/.claude/commands/design.md"
}

test_config_bootstrap() {
    log_test "Config file is bootstrapped from upstream"

    # The .caps-sync.yml should exist and match upstream
    assert_file_exists "$DOWNSTREAM_DIR/.caps-sync.yml"
    assert_file_contains "$DOWNSTREAM_DIR/.caps-sync.yml" "template_owned:"
    assert_file_contains "$DOWNSTREAM_DIR/.caps-sync.yml" "shared:"
    assert_file_contains "$DOWNSTREAM_DIR/.caps-sync.yml" "app_owned:"
}

# =============================================================================
# Run Tests
# =============================================================================
main() {
    echo ""
    echo "=========================================="
    echo "  Safe Template Sync Test Suite"
    echo "=========================================="
    echo ""

    # Setup
    setup_upstream_repo
    setup_downstream_repo

    # Copy actual script to downstream
    mkdir -p "$DOWNSTREAM_DIR/.claude/scripts"
    cp "$SCRIPT_DIR/template-sync.sh" "$DOWNSTREAM_DIR/.claude/scripts/template-sync.sh"
    cp "$UPSTREAM_DIR/.caps-sync.yml" "$DOWNSTREAM_DIR/.caps-sync.yml"
    (
        cd "$DOWNSTREAM_DIR"
        git add -A
        git commit -m "Add sync script and config" --quiet
    )

    # Set environment variable for testing (points to local upstream)
    export TEMPLATE_UPSTREAM="$UPSTREAM_DIR"

    echo ""
    echo "=========================================="
    echo "  Running Tests"
    echo "=========================================="
    echo ""

    # Run tests in order
    test_check_mode
    test_template_owned_overwrite
    test_template_owned_new_files
    test_template_owned_deletion
    test_shared_additive_gitmodules
    test_shared_section_claude_md
    test_shared_deep_merge_devcontainer
    test_app_owned_untouched
    test_auto_mode_no_commit
    test_upstream_update_propagates
    test_new_template_file_added
    test_deleted_template_file_removed
    test_config_bootstrap

    # Summary
    echo ""
    echo "=========================================="
    echo "  Test Summary"
    echo "=========================================="
    echo ""
    echo -e "Tests run:    ${TESTS_RUN}"
    echo -e "Tests passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Tests failed: ${RED}${TESTS_FAILED}${NC}"
    echo ""

    if [ "$TESTS_FAILED" -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed.${NC}"
        exit 1
    fi
}

main "$@"
