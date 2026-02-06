---
description: Create GitHub issue in template repo for CAPS improvements. Used by /retro.
model: claude-sonnet-4-20250514
allowed-tools: Bash
argument-hint: "<issue description>"
---

ultrathink

# /propose-upstream - Create Upstream Issue

Creates a GitHub issue in the CAPS template repository to propose improvements discovered during sprint retrospectives.

## Process

### Step 1: Fetch Existing Issues

First, retrieve all open upstream issues:

```bash
TEMPLATE_URL="${TEMPLATE_UPSTREAM:-https://github.com/the-original-body/tob-webapp-stack.git}"
TEMPLATE_REPO=$(echo "$TEMPLATE_URL" | sed -E 's#.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')

gh issue list --repo "$TEMPLATE_REPO" --state open --limit 100 --json number,title,body
```

### Step 2: Semantic Duplicate Check

Review the list of existing issues and compare them against the proposed issue:

**Proposed issue:** `$ARGUMENTS`

Perform a **semantic comparison** (not keyword matching):
- Does an existing issue address the same underlying problem?
- Would the proposed issue be redundant if an existing one were resolved?
- Is this a variation of an existing issue or truly unique?

### Step 3: Priority Assessment

If the issue is unique, assess its priority based on these criteria:

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
1. **Impact**: How many users/workflows are affected?
2. **Severity**: Does it block work or just slow it down?
3. **Workaround**: Can users continue without the fix?
4. **Frequency**: How often does this issue occur?
5. **Risk**: Could this cause data loss, security issues, or corruption?

Export your priority assessment as: `PRIORITY="high"` or `"medium"` or `"low"`

### Step 4: Decision

**If duplicate found:**
- Report which existing issue(s) cover this problem
- Do NOT create a new issue
- Suggest updating/commenting on the existing issue if needed

**If unique:**
- Proceed to create the issue with your assessed priority:

```bash
bash .claude/scripts/propose-upstream.sh "$ARGUMENTS" "$PRIORITY"
```

## Constraints

- **NEVER** include secrets or sensitive information in issue descriptions
- **NEVER** create duplicate issues - always complete the semantic check first
- Issues should describe CAPS/template improvements, NOT app-specific problems
