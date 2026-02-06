# Branch Conventions

## Naming Patterns

| Type | Pattern | Created By | Example |
|------|---------|------------|---------|
| Feature | `feat/<slug>` | `/design` or manual | `feat/user-auth` |
| Fix | `fix/<slug>` | `/design` or manual | `fix/login-bug` |
| Preview | `preview/<slug>` | Manual | `preview/experiment` |
| Build | `build/<slug>/issue-<N>` | `/build` (worktrees) | `build/user-auth/issue-42` |

## Slug Rules

- **Format**: kebab-case (`user-authentication` not `userAuthentication`)
- **Content**: Descriptive of what is being built/fixed
- **Length**: Max 50 characters
- **Reserved**: Never use `main`, `master`, `HEAD`

## Session State

`.claude/session.json` tracks the current TIDE work cycle:

```json
{
  "current_slug": "user-auth",
  "branch": "feat/user-auth",
  "phase": "design",
  "updated_at": "2026-01-03T10:00:00Z"
}
```

### Phase Progression

```
design → design-complete → breakdown → build → pr-created
```

| Phase | Description |
|-------|-------------|
| `design` | PRD being written |
| `design-complete` | PRD finished, ready for breakdown |
| `breakdown` | Issues being created |
| `build` | Implementation in progress |
| `pr-created` | PR opened, awaiting review/merge |

## TIDE Integration

| Command | Git Action |
|---------|------------|
| `/design <slug>` | Creates `feat/<slug>` or `fix/<slug>`, initializes session |
| `/breakdown` | No branch change, creates GitHub issues |
| `/build` | Creates worktree branches, implements, creates PR |
| PR merge | Session cycle complete |

## Branch Protection

### `main` Branch

- No direct commits (enforced by pre-commit hook)
- No file edits (enforced by PreToolUse hook)
- Changes only via merged PRs

### Feature Branches

- Direct commits allowed
- Force push allowed (with warning)
- Deleted after PR merge

## Quick Reference

```bash
# Start new feature (manual, outside TIDE)
git checkout main && git pull
git checkout -b feat/my-feature

# Start new fix
git checkout -b fix/bug-description

# Preview deployment
git checkout -b preview/experiment
git push origin preview/experiment

# Check current context
cat .claude/session.json 2>/dev/null || echo "No active session"
git branch --show-current
```
