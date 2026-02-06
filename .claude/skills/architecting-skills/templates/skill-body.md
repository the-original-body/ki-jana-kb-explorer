---
name: [verb]-ing-[object]
description: |
  [Action verb] [object] to [outcome]. Use when [specific trigger scenario], 
  [trigger scenario], or when the user mentions [keyword].
allowed-tools: Read, Write, Glob, WebSearch, Bash
---

# [Skill Name]

> [One-line summary of capability]

## 1. Context Injection (MANDATORY)
**Before** proceeding, determine the user's specific need and read the relevant reference:
*   **IF** [Scenario A]: `Read("reference/scenario-a.md")`
*   **IF** [Scenario B]: `Read("reference/scenario-b.md")`

## 2. Validation Protocol (WebSearch)
Your training data might be outdated.
*   **Trigger:** If using [Specific Library/Tool], run `WebSearch` to verify the latest API.

## 3. Core Workflow
1.  [Step 1]
2.  [Step 2]

## 4. Critical Rules
**ALWAYS:**
- [Rule 1]
- [Rule 2]

**NEVER:**
- [Anti-Pattern]