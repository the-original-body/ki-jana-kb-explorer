---
description: Socratic Gatekeeper - Transforms chat into a technical PRD, or imports external PRDs with quality assessment. Sets session context.
model: claude-opus-4-5
allowed-tools: AskUserQuestion, Read, Write, Glob, Bash
argument-hint: [app-name-slug] [--import]
---

ultrathink

# /design - Architectural Specification Engine

## Phase 0: Parse Arguments & Determine Mode

**Rule: Slug is optional (can be inferred). Mode defaults to interactive.**

```bash
bash .claude/scripts/design.sh parse $ARGUMENTS
```

Parse the output to extract `MODE` and `SLUG` values.

## Mode Dispatch

**If MODE is "import":** Skip to [Phase 1-Import](#phase-1-import-collect-prd)
**If MODE is "interactive":** Continue to [Phase 0.05](#phase-005-check-specifications-file)

## Phase 0.05: Check SPECIFICATIONS File

**Only runs in interactive mode. Import mode always creates PRDs.**

Check if SPECIFICATIONS.md exists:

```bash
if [[ -f "docs/SPECIFICATIONS.md" ]]; then
  OUTPUT_TYPE="technical-plan"
  echo "📋 Found SPECIFICATIONS.md - will create Technical Plan"
else
  OUTPUT_TYPE="prd"
  echo "⚠️  No SPECIFICATIONS.md found"
fi
```

**If SPECIFICATIONS.md does NOT exist:**

Use `AskUserQuestion`:
"No SPECIFICATIONS.md found. This command works best with a specifications file. Do you want to proceed anyway and create a PRD from our conversation?"

Options: [Yes - create PRD from conversation, No - I'll create SPECIFICATIONS.md first]

- **If "Yes":** Set `OUTPUT_TYPE="prd"`, continue to Phase 0.1
- **If "No":** Exit with message:
  ```
  Please create docs/SPECIFICATIONS.md with your requirements and run /design again.
  ```

**If SPECIFICATIONS.md exists:**

Set `OUTPUT_TYPE="technical-plan"`, continue to Phase 0.1

## Phase 0.1: Slug Resolution (Interactive)

**Only for interactive mode. Import mode resolves slug from PRD title.**

If SLUG is empty, attempt to infer from conversation context:

1. **Scan conversation history** for feature names, app descriptions, or explicit mentions
2. If a clear feature name is found, convert to kebab-case slug
3. If unclear, use `AskUserQuestion`:
   "What slug should identify this feature? (e.g., user-auth, payment-flow)"
   **STOP AND WAIT**

Once SLUG is determined, continue to Phase 0.2.

## Phase 0.2: Branch & Session Setup

**Runs for both modes after slug is known.**

```bash
bash .claude/scripts/design.sh setup "$SLUG" "$MODE"
```

This will:
- Check if PRD already exists (error if so - immutability rule)
- Clean up previous sprint artifacts
- Sync with main branch
- Create feature branch (`feat/$SLUG` or `fix/$SLUG`)
- Initialize `.claude/session.json`

**After setup:**
- If MODE is "interactive": Continue to Phase 1 (Context & Skill Injection)
- If MODE is "import": Continue to Phase 2-Import (Quality Assessment)

## Phase 1: Context & Skill Injection (Thinking Mode)

**think hard** about the gathered context (the entire conversation history) and necessary architecture constraints.

1.  **Load Architecture Skills:**
    *   Read `.claude/skills/architecting-redwood/SKILL.md` to enforce framework rules (MANDATORY - always load).
    *   Read `.claude/skills/managing-d1-migrations/SKILL.md` (if available) for database constraints.

    **If OUTPUT_TYPE is "technical-plan":**
    *   Read `docs/SPECIFICATIONS.md` to transform non-technical requirements into technical implementation plan.

2.  **Initialize Progress State:**
    Create a temporary file `.claude/progress/design-$SLUG.md` to track the Socratic Loop:
    ```markdown
    # Design Progress: $SLUG
    - [ ] Analyze Chat Context (Identify Gaps)
    - [ ] Clarify Data Model (Socratic Question 1)
    - [ ] Clarify Auth & Security (Socratic Question 2)
    - [ ] Clarify Edge Cases (Socratic Question 3)
    - [ ] Finalize PRD
    ```

## Phase 2: Socratic Gatekeeper (Anoxic Phase)

**CONTEXT FREEZE:** Use `AskUserQuestion` tool exclusively. All questions must have multiple-choice answers - this prevents scope creep by design.

**Loop Logic:**
1. Check `.claude/progress/design-$SLUG.md` for all unchecked items.
2. Batch as many clarifying questions as possible into a single `AskUserQuestion` call (e.g., if 15 gaps exist, group them together).
3. After receiving answers, update all corresponding progress checkboxes `[x]`.
4. If any gaps remain, repeat with next batch.
5. Once all items are checked, proceed to Phase 3.

**Question Format - Technical Terms:**

When questions involve technical concepts, provide brief explanations BEFORE the `AskUserQuestion` call:

```markdown
**Auth Method Context:**
- **Email/Password:** Traditional username/password stored in database
- **OAuth:** "Sign in with Google/GitHub" - delegates auth to third party
- **Magic Link:** Passwordless - user clicks email link to authenticate
- **None:** Public access, no authentication required

Now using AskUserQuestion tool with options: [Email/Password, OAuth, Magic Link, None]
```

**Guidelines:**
- Keep explanations concise (1 line per option)
- Focus on user impact, not implementation details
- Use plain language (avoid jargon in explanations themselves)
- Provide context BEFORE calling the tool, not embedded in options

## Phase 3: Write Design Document

Only proceed when all gaps are closed.

**Determine output path based on OUTPUT_TYPE:**

```bash
if [[ "$OUTPUT_TYPE" == "technical-plan" ]]; then
  mkdir -p docs
  OUTPUT_PATH="docs/technical-plan.md"
  DOC_TYPE="Technical Plan"
else
  mkdir -p docs/prd
  OUTPUT_PATH="docs/prd/$SLUG.md"
  DOC_TYPE="PRD"
fi
```

Write the appropriate document to $OUTPUT_PATH using the template below.

### PRD Template (Enforced Structure)

```markdown
# PRD: {{APP_NAME}}

**Status:** Frozen | **Date:** {{DATE}} | **Slug:** {{SLUG}}

## 1. Problem & User
[Concise description]

## 2. User Stories (INVEST)
- [ ] **As a** [role], **I want** [feature], **so that** [benefit].
- [ ] **As a** [role], **I want** [feature], **so that** [benefit].

## 3. Technical Architecture (Enforced)
*   **Routing:** `render(Document)` pattern ONLY.
*   **DB:** D1 SQLite limitations (no transactions -> use batch).
*   **State:** No global state in Workers.

## 4. Data Model (Schema Draft)
[Entities and Relations]

## 5. Out of Scope
- [What this does NOT include]

## 6. Open Questions
- [Any unresolved items - should be empty if Socratic phase complete]
```

### Technical Plan Template (When OUTPUT_TYPE is "technical-plan")

**Write to:** `docs/technical-plan.md`

```markdown
# Technical Implementation Plan: {{APP_NAME}}

**Based on:** docs/SPECIFICATIONS.md
**Status:** Frozen | **Date:** {{DATE}} | **Slug:** {{SLUG}}

---

## Architecture Overview

[High-level technical architecture summary]

**Key Technologies:**
- RedwoodSDK (React Server Components on Cloudflare Workers)
- D1 SQLite Database
- [Additional technologies from SPECIFICATIONS]

**Core Architecture Patterns:**
- **HTML Shell**: `render(Document)` for root document structure
- **UI Layouts**: `layout(MainLayout)` for navigation/sidebars
- **Data Access**: Server functions with `"use server"` directive
- **Environment Bindings**: `import { env } from 'cloudflare:workers'` for D1/KV/secrets
- **State Management**: React Server Components patterns, no global state

---

## Suggested Epic Structure

Based on the technical implementation below, this project should be divided into the following epics:

**EPIC 1: FRONTEND**
Scope: User interface, client-side components, routing, and layouts
Rationale: [Why these features are grouped together]

**EPIC 2: BACKEND**
Scope: Server functions, business logic, data processing
Rationale: [Why these features are grouped together]

**EPIC 3: API/INTEGRATION**
Scope: External integrations, API endpoints, data synchronization
Rationale: [Why these features are grouped together]

[Add more epics if needed - typically 3-5 total]

**Implementation Order Rationale:**
[Explain why this sequence makes sense - e.g., "Frontend first to validate UX, then backend to support it, then integrations"]

---

## Technical Implementation

**IMPORTANT: Organize features by epic. Each epic section will be extracted into a separate GitHub issue by /breakdown.**

### EPIC 1: FRONTEND

[Group all frontend-related features here]

#### [Feature Name - Frontend]

**Non-Technical Requirement:**
[Copy requirement description from SPECIFICATIONS.md]

**Technical Implementation:**

**Routing:**
- Routes to create: `[path]` → `[PageComponent]`
- Route parameters: `[dynamic segments]`
- Layouts to use: `[MainLayout, DashboardLayout, etc.]`

**Components:**
- `ComponentName.tsx` - [Purpose and behavior]
  - Type: [Client component ("use client") or Server component (default)]
  - Props: `[interface definition]`
  - Responsibilities: [What it does]
- [List all components needed for this feature]

**Server Functions:**
```typescript
// src/lib/[category].server.ts
"use server";

import { env } from 'cloudflare:workers';
import type { Env } from '../worker';

export async function functionName(params): Promise<ReturnType> {
  const typedEnv = env as Env;
  // Implementation details
}
```

**Data Access:**
- D1 queries needed: [List specific SQL queries]
- Use `.bind()` for all parameters to prevent SQL injection
- Tables accessed: [List tables]
- Indexes required: [Any specific indexes for performance]

**State Management:**
- [How data flows between server and client components]
- [What state lives where]
- [How updates propagate]

**Client-Side Interactions:**
- Forms: [How forms are handled, validation patterns]
- Real-time updates: [If applicable]
- Error handling: [User-facing error states]

**Edge Cases:**
- [Technical handling of edge cases from SPECIFICATIONS]
- [Error scenarios and recovery]
- [Performance considerations]

[Repeat for all frontend features...]

---

### EPIC 2: BACKEND

[Group all backend-related features here]

#### [Feature Name - Backend]

[Same detailed structure as above for backend features...]

---

### EPIC 3: API/INTEGRATION

[Group all API/integration features here]

#### [Feature Name - API]

[Same detailed structure as above for API features...]

---

[Add more epic sections as needed - typically 3-5 total]

---

## Complete Data Model

### D1 Schema

```sql
-- migrations/001_initial_schema.sql

-- [Table 1]
CREATE TABLE table_name (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field1 TEXT NOT NULL,
  field2 INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  INDEX idx_field1 (field1)
);

-- [Table 2]
CREATE TABLE another_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  foreign_key_id INTEGER NOT NULL,
  FOREIGN KEY (foreign_key_id) REFERENCES table_name(id)
);

-- [Continue for all tables...]
```

### Schema Rationale

[Explain key schema decisions:]
- Why certain relationships are structured this way
- Index choices and performance implications
- Data type selections (TEXT vs INTEGER, etc.)
- Migration strategy considerations

---

## Architecture Constraints

### Cloudflare Workers (V8 Isolate) Constraints

**Mandatory:**
- No Node.js APIs (`fs`, `path`, `child_process`) without `nodejs_compat` flag
- No global state across requests - each request is isolated
- 10ms CPU time limit per request - optimize hot paths
- Cold start optimization - minimize initialization work
- Memory limits - be efficient with large data structures

**Recommendations:**
- Use streaming for large responses
- Cache static data in KV when appropriate
- Batch D1 operations to reduce round trips

### RedwoodSDK Patterns (Mandatory)

**Critical Rules:**
- MUST use `render(Document)` for HTML shell - NEVER use `layout(Document)`
- MUST use `layout(MainLayout)` for UI wrappers - separate from Document
- MUST use `"use server"` directive for all database access
- MUST use `import { env } from 'cloudflare:workers'` for environment bindings (D1, KV, secrets)
- MUST import from correct paths: `rwsdk/client`, `rwsdk/worker`

**File Organization:**
- Server functions: `src/lib/*.server.ts`
- Client components: `src/components/*` with `"use client"` directive
- Server components: `src/components/*` without directive (default)
- Routes: `src/pages/*` or defined in `src/worker.tsx`

### D1 Database Constraints

**SQLite Limitations:**
- Foreign key constraints not enforced by default (enable with PRAGMA if needed)
- No true transactions - use batch operations for multiple writes
- Integer-based timestamps preferred (`unixepoch()`)
- Text search requires careful indexing

**Performance:**
- Create indexes for frequently queried columns
- Use prepared statements with `.bind()` for all parameters
- Batch reads/writes when possible to reduce latency
- Consider denormalization for read-heavy access patterns
```

---

## Phase 4: Completion & Cleanup

```bash
bash .claude/scripts/design.sh complete "$SLUG"
```

This will:
- Delete the temporary progress file
- Update session.json to `phase: "design-complete"`

Output message based on OUTPUT_TYPE:

**If OUTPUT_TYPE is "technical-plan":**
   ```
   ✅ Technical Plan created at docs/technical-plan.md
      Architecture constraints applied.
      Suggested epic structure included.

   Run /breakdown to create EPIC issues.
   ```

**If OUTPUT_TYPE is "prd":**
   ```
   ✅ PRD created at docs/prd/$SLUG.md
      Architecture constraints applied.

   Run /breakdown to generate GitHub Issues.
   ```

# Import Mode Phases

**These phases run when `--import` flag is provided.**

## Phase 1-Import: Collect PRD

**If no PRD content was provided in arguments:**

Use `AskUserQuestion`:
"Please paste the PRD document you want to import. The PRD will be evaluated and transformed to our standard format."

**STOP AND WAIT** for user to paste PRD content.

**Slug Inference (Import Mode):**
1. If explicit SLUG was provided in arguments, use it
2. Otherwise, extract from PRD title: `# PRD: User Auth Feature` → `user-auth-feature`
3. If no title found, use `AskUserQuestion` to request slug

Once SLUG is known, run Phase 0.2 (Branch & Session Setup), then continue to Phase 2-Import.

## Phase 2-Import: Quality Assessment

**ultrathink** - Evaluate the provided PRD against quality criteria.

**Load Architecture Skills (for validation):**
*   Read `.claude/skills/architecting-redwood/SKILL.md` (if available) to validate framework compliance.
*   Read `.claude/skills/managing-d1-migrations/SKILL.md` (if available) to validate data model constraints.

### Quality Scoring (Internal Evaluation)

| Criterion | Weight | Check |
|-----------|--------|-------|
| Clear problem statement | 20% | Has meaningful problem/user description |
| INVEST user stories | 25% | Stories follow "As a... I want... so that..." format |
| Architecture awareness | 15% | Mentions tech constraints or is appropriately tech-agnostic |
| Data model clarity | 15% | Entities/relations defined or clearly not needed |
| Scope boundaries | 15% | Out of scope section exists and is meaningful |
| Completeness | 10% | No major gaps, contradictions, or missing context |

### Quality Tiers & Response

**High Quality (≥80%)**
- PRD is well-structured and comprehensive
- Transform to standard 6-section format, preserving original content/wording
- Ask 0-2 minor clarifying questions ONLY if critical information is missing
- Proceed to Phase 3-Import

**Medium Quality (50-79%)**
- PRD has substance but notable gaps
- Identify 3-5 specific gaps that need clarification
- Use `AskUserQuestion` for EACH gap (one question at a time)
- **STOP AND WAIT** after each question
- Incorporate answers into the PRD
- After all gaps addressed, proceed to Phase 3-Import

**Low Quality (<50%)**
- PRD lacks essential information or is too vague to transform
- Do NOT proceed to write PRD
- Explain what's missing or unclear (be specific, not generic)
- Engage in conversation to gather requirements:
  "This PRD needs more detail before I can transform it. Let's build it together..."
- Ask focused questions about the most critical missing pieces
- **This effectively becomes interactive mode** with the user's draft as starting context
- Once sufficient detail gathered, re-evaluate quality and proceed accordingly

## Phase 3-Import: Transform & Write

**Only reached when quality ≥ 50% (after any necessary clarifications).**

### Transform to Standard Format

1. **Map content to 6-section template:**
   - Section 1: Extract/synthesize problem statement
   - Section 2: Convert stories to INVEST format ("As a... I want... so that...")
   - Section 3: Add architecture constraints (use standard Cloudflare/RedwoodSDK constraints)
   - Section 4: Extract/organize data model entities
   - Section 5: Identify scope boundaries
   - Section 6: Open Questions (should be empty after clarifications)

2. **Preservation Rule:** Keep original wording/intent where possible. Do not add features or remove scope.

3. **Write Document:**
   ```bash
   # Import mode always creates PRDs
   mkdir -p docs/prd
   OUTPUT_PATH="docs/prd/$SLUG.md"
   OUTPUT_TYPE="prd"
   ```

   Write the transformed PRD to $OUTPUT_PATH

4. **Continue to Phase 4** (Completion & Cleanup)
