# Critical Anti-Patterns

Avoid these common mistakes that degrade agent performance.

## 1. The Monolith
*   **Bad:** Putting all knowledge into `SKILL.md`.
*   **Why:** It fills the context window with irrelevant data.
*   **Fix:** Move details to `reference/`.

## 2. The "Helper" Trap
*   **Bad:** Naming skills `utils`, `helpers`, or `misc`.
*   **Why:** The semantic router cannot understand when to trigger these.
*   **Fix:** Use specific gerunds: `formatting-dates`, `validating-schemas`.

## 3. Passive Descriptions
*   **Bad:** "Helps with testing."
*   **Why:** Too vague. The agent won't know when to pick this tool.
*   **Fix:** "Use when writing new unit tests, debugging Vitest failures, or mocking API calls."

## 4. Implicit Context
*   **Bad:** Assuming the agent knows the library version.
*   **Fix:** Force `WebSearch` for version-specific syntax if it's not hardcoded in a `reference/` file.

## 5. Trivial Scripts
*   **Bad:** Creating scripts for trivial operations (single git commands, simple JSON edits).
*   **Why:** Adds maintenance burden for no benefit.
*   **Fix:** Use scripts for complex, multi-step workflows where determinism and reliability matter. Simple operations don't need scripts.

## 6. Forgetting Claude Is Smart
*   **Bad:** Explaining things Claude already knows (what PDFs are, how git works, basic programming concepts).
*   **Why:** Wastes context window tokens on obvious information.
*   **Fix:** Only add context Claude doesn't already have:
    - Project-specific conventions
    - Internal API schemas
    - Custom workflow rules
    - Domain knowledge unique to your codebase
