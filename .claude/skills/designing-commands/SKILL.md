---
name: designing-commands
description: |
  Design, scaffold, and validate new Claude Code slash commands.
  Use when the user wants to automate a workflow, create a new tool, or standardize a process.
  Triggers: "create command", "new workflow", "automate task", "write a slash command".
allowed-tools: Read, Write, Glob, WebSearch, Bash
---

# Command Architect

> Designs automation workflows following the strict Tier structure and YAML/Markdown standards.

## 1. Context Injection (MANDATORY)
**Before** writing any command file, you MUST determine the complexity tier and read the relevant standards:

*   **Determine Tier:**
    *   *Tier 1 (Utility):* Simple, single-step (e.g., "find todos").
    *   *Tier 2 (Workflow):* Linear, multi-step (e.g., "create commit").
    *   *Tier 3 (Autonomous):* Complex, phased, checkpoints (e.g., "fix issue", "release").
*   **Load Architecture:** `Read("reference/command-architecture.md")`
*   **Load Templates:** `Read("templates/tier1.md", "templates/tier2.md" or "templates/tier3.md")` (Load ONLY the matching tier).

## 2. Validation Protocol (The "Syntax-Check" Rule)
Command instructions often fail because they use incorrect CLI flags or outdated tool arguments.

*   **Volatile Syntax:** If the new command uses CLI tools (e.g., `gh`, `aws`, `kubectl`, `npm`), use `WebSearch` to verify the exact flags and output formats.
    *   *Query:* "gh issue list json output format", "aws s3 sync flags".
*   **Timeless Syntax:** Rely on `reference/syntax-guide.md` for internal Claude Code syntax like `!command`, `@file`, and `$ARGUMENTS`.

## 3. Core Workflow

### Phase 1: Definition
1.  **Name:** Determine the filename (kebab-case, e.g., `fix-issue.md`).
2.  **Namespace:** Decide if it belongs in a subdirectory (e.g., `.claude/commands/release/`).
3.  **Frontmatter:** Define `allowed-tools` strictly. Only grant what is needed.
    *   **Commands vs Skills:** Commands are user-invoked (via `/command-name`) and should NOT have a `name:` field. Skills are model-invoked and MUST have a `name:` field in `.claude/skills/*/SKILL.md`.

### Phase 2: Skill Dependency Mapping (CRITICAL)
**Identify required capabilities:** Does this command require domain expertise (e.g., DB migrations, UI design)?
*   **IF YES:** You MUST verify if a relevant skill exists in `.claude/skills/`.
*   **Action:** Add an explicit instruction in the command's "Phase 1" to read that skill's `SKILL.md`.
    *   *Example:* "Load DB Expertise: `Read('.claude/skills/managing-d1-migrations/SKILL.md')`"

### Phase 3: Structural Drafting
1.  **Use the Template:** Copy the structure from `templates/`.
2.  **State Management (Tier 3 Only):** If the command is complex, you MUST generate a "Progress Tracking" section that writes to `.claude/progress/`.
3.  **Extended Thinking:** Use `think hard` or `ultrathink` keywords in the command body for complex reasoning steps.

### Phase 4: File Creation
1.  Create the file in `.claude/commands/...`.
2.  Validate that `description` and `argument-hint` are present in the YAML header.
3.  **CRITICAL:** Ensure the frontmatter does NOT contain a `name:` field (that's only for skills in `.claude/skills/*/SKILL.md`).

## 4. Critical Rules (Enforced)
**ALWAYS:**
- Use **kebab-case** for filenames.
- Include `model: claude-sonnet-4-5-20250929` (or newer) for complex logic.
- Use explicit "STOP" checkpoints in Tier 3 commands.
- **Inject Skills:** Explicitly `Read()` the `SKILL.md` of any domain skill required for the task. Do not rely on the agent "knowing" how to migrate a database; force it to read the manual.

**NEVER:**
- Create "Do-Everything" commands (Monoliths). Split them.
- Forget the YAML frontmatter.
- Use ambiguous constraints (e.g., "Be careful"). Use explicit constraints (e.g., "Do NOT delete files").
- Include a `name:` field in command frontmatter (commands are user-invoked via filename, not name field).
- Use `---` anywhere except YAML frontmatter delimiters. The parser interprets `---` as document boundaries, breaking commands with heredocs containing `---`.

## 5. External Scripts Pattern (Tier 2-3)

For commands with complex bash logic, **delegate to external scripts** rather than inline bash:

**When to use external scripts:**
- Any heredocs
- Argument parsing (flags, options, positional args)
- Control flow (if/for/while/case)
- More than ~5 lines of bash
- Logic that needs to be testable independently

**Pattern:**
1. Create script in `.claude/scripts/<command-name>.sh`
2. Command file calls the script with arguments
3. Script handles all bash complexity

**Example structure:**
```markdown
## Execute
\`\`\`bash
bash .claude/scripts/my-command.sh $ARGUMENTS
\`\`\`
```

**Benefits:**
- Deterministic execution (no Claude interpretation of multi-phase bash)
- Testable independently (`bash .claude/scripts/x.sh --help`)
- Avoids YAML parser conflicts with `---` in heredocs
- Cleaner command files focused on workflow, not bash details

See `/propose-upstream` and `/retro` as reference implementations.
