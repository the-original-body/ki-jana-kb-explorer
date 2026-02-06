# Syntax & Tooling Reference

## YAML Frontmatter Fields
*   `description`: Mandatory. Shows in `/help`.
*   `argument-hint`: Optional. E.g., `[issue-id]`.
*   `allowed-tools`: Comma-separated list.
*   `model`: Force a specific model (e.g., `claude-opus-4-5`).
*   `disable-model-invocation`: Optional. Set to `true` to prevent the Skill tool from invoking this command.

## YAML Parser Warning
**CRITICAL:** The `---` sequence is reserved for YAML frontmatter boundaries. Using `---` anywhere else in the command file (e.g., inside heredocs, as separators) will break parsing. The command will fail silently.

**Bad:**
```bash
cat << EOF
---
This breaks the parser!
---
EOF
```

**Solution:** Use external scripts in `.claude/scripts/` for complex bash with heredocs.

## Tool Permissions
*   `Bash(git:*)`: Allows all git commands.
*   `Bash(npm test)`: Strict allowlist for one command.
*   `Read`, `Edit`, `Write`: Filesystem access.
*   `Glob`, `Grep`: Discovery.
*   `WebSearch`: Internet access.

## Thinking Budgets
Use these keywords in the command body to trigger reasoning:
*   `think`: Standard reasoning.
*   `think hard`: Complex analysis.
*   `ultrathink`: Maximum architectural reasoning (Tier 3).
