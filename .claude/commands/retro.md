---
description: Review recent work and propose CAPS improvements upstream.
model: claude-sonnet-4-20250514
allowed-tools: Bash, Read, Write
argument-hint: "<optional context>"
---

ultrathink

# /retro - Retrospective

Review recent work and identify CAPS-related improvements to propose upstream.

## Your Task

Analyze the conversation history since the last `/retro` (or from the start of the conversation if none) and identify **CAPS-related issues only**:

- Commands that failed or behaved unexpectedly
- Missing skills or knowledge gaps in auto-claude
- Workflow inefficiencies in the TIDE process
- Bugs in CAPS tooling (commands, scripts, skills)
- Documentation gaps or improvements needed

**Important:** Focus on template/tooling issues, NOT app-specific bugs or features.

## Process

### Step 1: Identify Issues

Review the conversation and list CAPS-related issues found. For each issue, note:
- What went wrong
- Which component was affected (command, skill, script, workflow)
- Suggested improvement

### Step 2: Fetch Existing Issues (Once)

Before creating new issues, fetch all open upstream issues to check for duplicates:

```bash
# Extract template repo
TEMPLATE_URL="${TEMPLATE_UPSTREAM:-https://github.com/the-original-body/tob-webapp-stack.git}"
TEMPLATE_REPO=$(echo "$TEMPLATE_URL" | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')

# Fetch all open issues (cached for efficiency)
EXISTING_ISSUES=$(gh issue list \
  --repo "$TEMPLATE_REPO" \
  --state open \
  --limit 100 \
  --json number,title)
```

### Step 3: Create Upstream Issues (With Semantic Review & Priority Assessment)

For each CAPS issue identified:

1. **Semantic comparison**: Compare the issue against `$EXISTING_ISSUES` fetched in Step 2
   - Does an existing issue address the same underlying problem?
   - Would this be redundant if an existing issue were resolved?
   - Is this a variation of an existing issue or truly unique?

2. **If duplicate**: Skip creation, note which existing issue covers it

3. **If unique**: Assess priority based on these criteria:

   **Priority: High**
   - Blocks or breaks core TIDE workflow functionality
   - Security vulnerabilities or credential exposure risks
   - Data loss or corruption scenarios
   - Critical workflow failures (can't create PRDs, can't build, can't deploy)
   - Affects multiple users/projects

   **Priority: Medium**
   - Impacts workflow efficiency but has workarounds
   - Performance degradation (slow commands, unnecessary API calls)
   - Missing validation that could lead to errors
   - Documentation gaps for critical features
   - Inconsistent behavior causing confusion

   **Priority: Low**
   - Nice-to-have improvements with minimal impact
   - UI/UX polish (better formatting, output messages)
   - Documentation for edge cases
   - Optional feature enhancements
   - Convenience additions

   **Decision Factors:**
   - **Impact**: How many users/workflows are affected?
   - **Severity**: Does it block work or just slow it down?
   - **Workaround**: Can users continue without the fix?
   - **Frequency**: How often does this issue occur?
   - **Risk**: Could this cause data loss, security issues, or corruption?

4. **Create the issue** with your assessed priority:
```bash
bash .claude/scripts/propose-upstream.sh "<issue description>" "<priority>"
```
   Where `<priority>` is "high", "medium", or "low" based on your assessment.

Collect the returned issue URLs for unique issues only.

### Step 4: Generate Summary

After creating all issues, run the retro script to generate the summary document:

```bash
bash .claude/scripts/retro.sh "<brief summary of the sprint>" "<issue_url_1>" "<issue_url_2>" ...
```

### Step 5: Report

Output a summary:
- Number of CAPS issues found
- Links to created upstream issues
- Path to the retro document

## Example Output

```
Retrospective Complete

Found 3 CAPS-related issues:

1. Heredoc syntax breaks YAML parser
   -> https://github.com/.../issues/25

2. Missing skill for OAuth patterns
   -> https://github.com/.../issues/26

3. /breakdown label inference incorrect
   -> https://github.com/.../issues/27

Summary saved to: docs/retros/retro-2025-12-31.md
```

## If No Issues Found

If no CAPS issues were encountered:

```bash
bash .claude/scripts/retro.sh "No CAPS issues identified."
```

Output: "No CAPS improvements needed."
