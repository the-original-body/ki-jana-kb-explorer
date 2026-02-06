---
description: [Action] [Object] in a linear workflow
model: claude-sonnet-4-20250514
allowed-tools: Bash, Read, Edit
argument-hint: [optional-args]
---

# [Command Title]

## Context
Gather dynamic context before execution:
*   **Current State:** !`[bash command to check state, e.g., git status]`
*   **Relevant File:** @[path/to/file]

## Instructions
1.  **Analyze** the context provided above.
2.  **Perform** [Action Step 1].
3.  **Perform** [Action Step 2].
4.  **Output** the result or confirmation.

## Constraints
*   Do NOT stop for user confirmation unless an error occurs.
*   Do NOT use complex reasoning loops (use Tier 3 for that).
*   Keep execution under 60 seconds.
