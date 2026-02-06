# Command Architecture Standards

## Complexity Tiers

### Tier 1: Simple Utility
*   **Scope:** Single purpose, immediate execution.
*   **Duration:** 5-30 seconds.
*   **Structure:** No phases, just instructions.
*   **Example:** `/find-todos`, `/summarize-file`.

### Tier 2: Focused Workflow
*   **Scope:** Linear process, typically 3-5 steps.
*   **Duration:** 30-90 seconds.
*   **Structure:** Context -> Instructions -> Output.
*   **Example:** `/quick-commit`, `/generate-tests`.

### Tier 3: Complex Autonomous Workflow
*   **Scope:** Multi-phase, reasoning-heavy, requires state management.
*   **Duration:** 90+ seconds.
*   **Structure:** Phase 1 (Understanding) -> Phase 2 (Planning) -> Phase 3 (Execution).
*   **State:** MUST use a checklist file in `.claude/progress/` to track state across context windows.
*   **Example:** `/fix-issue`, `/design`, `/release`.

## Special Syntax
*   `$ARGUMENTS`: Pass all user arguments.
*   `$1`, `$2`: Positional arguments.
*   `!command`: Execute a bash command and inject output (e.g., `!git status`).
*   `@file`: Inject file content.