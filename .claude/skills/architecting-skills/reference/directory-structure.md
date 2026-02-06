# Skill Directory Architecture

Every skill acts as a self-contained module. You must strictly adhere to this filesystem layout to ensure the agent can navigate the skill.

## The Hierarchy
```text
skill-name/                  # Kebab-case, gerund (e.g., deploying-workers)
├── SKILL.md                 # Entry point. Navigation logic & triggers.
├── reference/               # Static knowledge & documentation.
│   ├── patterns.md          # Reusable code patterns.
│   ├── rules.md             # Hard constraints & "Laws of Physics".
│   └── [domain].md          # Domain-specific knowledge (loaded on demand).
├── scripts/                 # Executable tools (Python/Bash).
│   └── [script_name].py     # For complex logic/validation.
└── templates/               # Boilerplate code to be copied by the agent.
    └── [component].tsx
Progressive Disclosure Rules
1. SKILL.md is the Index: It should be lightweight. It directs the agent to read files in reference/ only when needed.
2. Scripts for Logic: Do not ask the LLM to perform complex regex or math in the chat. Write a script in scripts/ and have the agent execute it.
