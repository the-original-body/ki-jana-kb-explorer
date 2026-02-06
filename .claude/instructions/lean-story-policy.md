# Lean Story Policy

## Principle

**Generate as FEW stories as realistically needed to achieve the goal.**

This policy prevents backlog bloat from over-splitting and ensures focused sprint outcomes.

## Story Generation Rules

### 1. Theme Focus

Stories only for the direct goal. No generic "Improve X" side-paths.

**Good:** "Add user authentication" → 3 stories (login, session, logout)
**Bad:** "Add user authentication" → 10 stories including "improve error handling", "refactor utils"

### 2. Minimal Count

| Feature Scope | Target Stories |
|---------------|----------------|
| Small (1-2 files) | 1-2 |
| Medium (1 module) | 2-4 |
| Large (cross-cutting) | 3-5 |

**Rule:** Start with 2-4 stories. Only add more if genuine dependencies/work packages require it.

### 3. No Micro-Slices

L-items should be sliced into M-sized stories, NOT into many S-splitters.

**Good:** L-story "Implement auth" → 2 M-stories (Login flow, Session management)
**Bad:** L-story "Implement auth" → 8 S-stories (Create form, Add button, Style input, ...)

### 4. DoR Check (Definition of Ready)

Every story MUST have before creation:
- [ ] Clear goal statement
- [ ] 3+ acceptance criteria
- [ ] Defined scope (what's in, what's out)
- [ ] No unresolved blockers

Stories without DoR → DO NOT CREATE.

### 5. Backlog First

Items that can wait → backlog without sprint label.

**Ask:** "Is this story required for the sprint goal?"
- Yes → Include in sprint
- No → Add to backlog, no sprint label

### 6. Theme Bundling

Related requirements bundled to one sprint theme. One epic or clear sprint-goal hint in PRD.

## Story Sizing Heuristic

| Size | Definition | Criteria |
|------|------------|----------|
| **S** | Trivial | < 2h work, 1 file, no unknowns |
| **M** | Normal | 2-8h work, 1-3 modules, clear scope |
| **L** | Complex | 8-16h work, 4+ modules, has risks/dependencies |

**Sizing Questions:**
- S: "I know exactly what to do, no research needed"
- M: "Clearly defined, but multiple steps/files"
- L: "Requires analysis, has risk or unknowns"

## Verboten (Never Do)

- Blind backlog inflation at intake
- Commit stories without DoR/INVEST
- Theme-foreign stories just to hit a number
- S-split spam (many tiny stories instead of few M-sized)
- More than 1 L-story per sprint without slicing

## Enforcement

This policy is enforced by:
1. `/breakdown` command validates story count (warns if > 5)
2. Pre-commit checklist requires DoR for all stories

## Examples

### Good Breakdown

```
PRD: Add user dashboard

Stories (3):
1. [M] Dashboard layout and navigation
2. [M] Usage metrics display with charts
3. [S] Export to CSV functionality
```

### Bad Breakdown (Over-Split)

```
PRD: Add user dashboard

Stories (10): ❌ TOO MANY
1. [S] Create dashboard route
2. [S] Add navigation link
3. [S] Create layout component
4. [S] Style header
5. [S] Add usage card
6. [S] Add chart library
7. [S] Create chart component
8. [S] Add export button
9. [S] Implement CSV export
10. [S] Add loading states
```

---

*Part of TIDE Process Orchestration*
