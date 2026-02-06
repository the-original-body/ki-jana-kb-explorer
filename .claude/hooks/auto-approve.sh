#!/bin/bash
# PreToolUse Hook: Blocks unsafe wrangler commands for agentic CI/CD governance
#
# This hook enforces the Zero-Direct-Access policy where AI agents can only
# edit Infrastructure as Code (IaC) artifacts, never execute deployment commands.
# All deployment operations must go through the CI/CD pipeline.
#
# Blocked commands:
#   - wrangler deploy       : Direct deployment is CI-only
#   - wrangler secret put   : Secrets must be configured via GitHub Actions secrets
#   - wrangler d1 execute   : Database operations require CI pipeline

# Extract the command string from CLAUDE_TOOL_INPUT
# Format: {"command": "...", ...} or command='...'
COMMAND_STRING=""

if [ -n "$CLAUDE_TOOL_INPUT" ]; then
  # Try to extract from JSON format: {"command": "..."}
  COMMAND_STRING=$(echo "$CLAUDE_TOOL_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

  # If JSON extraction failed, try the alternative format: command='...'
  if [ -z "$COMMAND_STRING" ]; then
    COMMAND_STRING=$(echo "$CLAUDE_TOOL_INPUT" | sed -n "s/.*command='\\([^']*\\)'.*/\\1/p")
  fi
fi

# If we couldn't extract a command, allow the operation (might not be a Bash tool call)
if [ -z "$COMMAND_STRING" ]; then
  exit 0
fi

# Check against forbidden command patterns
case "$COMMAND_STRING" in
  *"wrangler deploy"*"--dry-run"*|*"wrangler"*"--dry-run"*"deploy"*)
    # Allow dry-run commands for configuration validation
    exit 0
    ;;
  *"wrangler deploy"*)
    echo "Error: Command '$COMMAND_STRING' is denied by policy." >&2
    echo "Reason: Direct deployment is CI-only. Edit wrangler.jsonc and push to preview/* branch." >&2
    echo "" >&2
    echo "Allowed alternatives:" >&2
    echo "  - Edit wrangler.jsonc to configure deployment settings" >&2
    echo "  - Push changes to a preview/* branch to trigger CI/CD pipeline" >&2
    echo "  - Use 'npx wrangler deploy --dry-run' to validate configuration" >&2
    exit 1
    ;;
  *"wrangler secret put"*|*"wrangler secret"*"put"*)
    echo "Error: Command '$COMMAND_STRING' is denied by policy." >&2
    echo "Reason: Secret management must go through GitHub Actions secrets." >&2
    echo "" >&2
    echo "Allowed alternatives:" >&2
    echo "  - Document required secrets in CLAUDE.md" >&2
    echo "  - Configure secrets in GitHub Repository Settings > Secrets and variables > Actions" >&2
    echo "  - Reference secrets in workflows using \${{ secrets.SECRET_NAME }}" >&2
    exit 1
    ;;
  *"wrangler d1 execute"*|*"wrangler d1"*"execute"*)
    echo "Error: Command '$COMMAND_STRING' is denied by policy." >&2
    echo "Reason: Direct database operations are forbidden. Use migrations via CI pipeline." >&2
    echo "" >&2
    echo "Allowed alternatives:" >&2
    echo "  - Create migration files in migrations/ directory" >&2
    echo "  - Push changes to preview/* branch to apply migrations via CI" >&2
    echo "  - Use 'wrangler d1 migrations list' to check migration status (read-only)" >&2
    exit 1
    ;;
  *)
    # Command is allowed
    exit 0
    ;;
esac
