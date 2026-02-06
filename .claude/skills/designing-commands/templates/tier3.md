---
description: [Description]
model: claude-opus-4-5
allowed-tools: Bash(git:*), Read, Edit, Glob, Grep
argument-hint: [args]
---

# [Title]

## Phase 1: Context & Skill Injection
**think hard** about the task and necessary expertise.

1.  **Load Domain Skills (CRITICAL):**
    *   *Search for relevant skills:* `ls .claude/skills`
    *   *Inject expertise:* `Read(".claude/skills/[relevant-skill]/SKILL.md")` (e.g., managing-d1-migrations)
    *   *Note:* Only load skills strictly necessary for this task.

2.  **Initialize Progress State:**
    Create a temporary file `.claude/progress/[name]-$1.md` to track the loop:
    ```markdown
    # Progress: [Name]
    - [ ] Gather Context
    - [ ] [Step 1]
    - [ ] [Step 2]
    ```

3.  **Gather Context:**
    - !`git status`
    - !`gh issue view $1` (if applicable)

## Phase 2: Socratic Planning
1. Ask clarifying questions if needed (Check for gaps).
2. Update progress file `[x]` as you proceed.
**STOP: Wait for user confirmation.**

## Phase 3: Execution
1. Implement changes based on the loaded Skills.
2. Verify: !`npm test`

## Constraints
**NEVER:**
- Break the build.
- Commit without testing.
- Proceed without loading the necessary `SKILL.md`.
