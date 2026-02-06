---
description: Execute GitHub Issues via auto-claude's multi-agent system. Parallel builds with AI merge.
model: claude-sonnet-4-20250514
allowed-tools: Bash
argument-hint: [slug] [--parallel N] [--issue N] [--auto-merge] [--skip-pr]
---

# /build-auto-claude — Autonomous Build Pipeline

Executes GitHub Issues through auto-claude. Each issue runs in an isolated git worktree with Planner → Coder → QA agents. Completed worktrees merge back to the feature branch using auto-claude's AI conflict resolution.

## Pipeline

1. **Setup** — Validate prerequisites, fetch issues with `prd:{slug}` label
2. **Specs** — Convert issues to auto-claude spec format
3. **Build** — Parallel execution (default: 3 concurrent), retry once on failure
4. **Merge** — Sequential merge using auto-claude's three-tier AI merge
5. **PR** — Create PR if all merges succeed, include preview URL

## Execute

```bash
# Run the orchestrator
bash .claude/scripts/build/build-orchestrator.sh $ARGUMENTS
```

The orchestrator handles everything: parallel builds, retries, AI-powered merges, and PR creation. Status updates display in terminal throughout.

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | PR created, all issues implemented |
| 1 | Partial failure | Some builds failed after retry. Run again or use `--issue N` |
| 2 | Merge conflicts | AI merge couldn't resolve. Manual intervention required |

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--parallel N` | 3 | Max concurrent builds |
| `--issue N` | — | Build single issue only |
| `--auto-merge` | off | Merge PR automatically after success |
| `--skip-pr` | off | Don't create PR |

## Examples

```bash
/build-auto-claude user-auth              # Build all issues
/build-auto-claude user-auth --parallel 5 # 5 concurrent builds
/build-auto-claude --issue 42             # Single issue
/build-auto-claude user-auth --auto-merge # Build → PR → merge
```

## Runtime Control

```bash
# Pause specific issue (graceful, after current iteration)
touch .auto-claude/specs/042/PAUSE

# View logs
tail -f .auto-claude/logs/build-42-*.log

# Check status
cat .auto-claude/status/issue-42.json | jq
```

## Resume

Just run again. Completed issues (status=completed in `.auto-claude/status/`) are skipped.

## After Build

If not using `--auto-merge`:
1. Review PR at printed URL
2. Check preview at `{repo}-preview.tob.sh`
3. Merge via GitHub or `gh pr merge --squash`
4. Cleanup: `bash .claude/scripts/build/build-cleanup.sh`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build failed | Check `.auto-claude/logs/build-{N}-*.log`, retry with `--issue N` |
| Merge conflict | Exit code 2 means AI couldn't resolve. Check listed files manually |
| Stuck | Create `PAUSE` file, check logs, may need to discard: `python run.py --spec X --discard` |
