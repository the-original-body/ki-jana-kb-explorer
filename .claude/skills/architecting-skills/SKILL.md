---
name: architecting-skills
description: |
  Design, scaffold, and validate new AI agent skills.
  Use when the user wants to create a new capability, codify a workflow, or fix a broken skill.
  Triggers: "create a skill", "new skill", "write skill documentation", "define workflow".
allowed-tools: Read, Write, Glob, WebSearch, Bash
---

# Skill Architect

> Defines the strict architectural standards for creating high-fidelity Claude Code skills.

## 1. Context Injection (MANDATORY)
**Before** generating any skill content, you MUST read the following architecture definitions to ground your reasoning:

*   **Structure & Layout:** `Read("reference/directory-structure.md")`
*   **Quality Standards:** `Read("reference/anti-patterns.md")`
*   **Templates:** `Read("templates/skill-body.md")`

## 2. Validation Protocol (The "Live-Check" Rule)
You must distinguish between **Timeless Principles** and **Volatile Syntax**.

*   **Timeless Knowledge:** Architecture patterns, best practices, and methodology (e.g., "TDD Red/Green cycle") go into `reference/` files.
*   **Volatile Details:** Specific API syntax, CLI flags, or library versions (e.g., "Vitest config options") MUST be verified via `WebSearch` if you are not 100% certain of the current version.
    *   *Trigger:* If the skill involves a specific tool (e.g., "Drizzle ORM"), search for its latest documentation before writing the `reference/` file.

## 2.5 Minimalism Principle

**Default assumption: Claude is already very smart.**

Before adding content, ask:
1. Does Claude really need this? (It already knows common tools and concepts)
2. Is this project-specific knowledge Claude couldn't infer?

**Prefer:**
- Project-specific conventions and workflows
- Internal schemas and APIs
- Domain knowledge unique to your codebase
- Scripts for complex multi-step workflows (determinism matters)

**Avoid:**
- Explaining common tools or concepts Claude already knows
- Scripts for trivial single-step operations

## 3. Core Workflow

### Phase 1: Taxonomy & Naming
1.  **Name:** Must use **gerunds** (verb + -ing).
    *   ✅ `managing-d1-migrations`
    *   ❌ `d1-manager`
2.  **Scope:** If the skill exceeds 500 lines or covers multiple domains, split it.

### Phase 2: Knowledge Segmentation
Decide where the information lives based on the **Timeless vs. Volatile** rule:
*   **`SKILL.md`:** Navigation logic, decision trees, and triggers ONLY.
*   **`reference/`:** Detailed documentation, examples, and timeless concepts.
*   **`scripts/`:** Deterministic logic (Python/Bash) to avoid LLM hallucination in complex calculations.

### Phase 3: Drafting
1.  Create the directory: `mkdir -p .claude/skills/[skill-name]/{reference,scripts,templates}`.
2.  Write `SKILL.md` using the frontmatter from `templates/skill-body.md`.
3.  Write reference files based on your WebSearch findings.

## 4. Critical Rules (Enforced)
**ALWAYS:**
- Use **YAML Frontmatter** with a specific `description` that includes trigger phrases (WHAT + WHEN).
- Move code examples longer than 20 lines into `reference/` or `scripts/`.
- Explicitly state `Read("reference/...")` commands in the `SKILL.md` to force context loading (Progressive Disclosure).

**NEVER:**
- Create monolithic `SKILL.md` files (> 150 lines is a warning, > 500 is illegal).
- Hardcode volatile syntax without validation.
- Use generic names like "helper" or "utils".