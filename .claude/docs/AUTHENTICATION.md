# CAPS Template Authentication Guide

## Critical: Read Before Modifying Authentication Code

The authentication mechanism for accessing the private upstream template repository (`tob-webapp-stack`) has been broken multiple times by well-intentioned "improvements". This document explains why the current approach works and what approaches have failed.

## How Authentication Works

### For Template Sync (`/update` command)

**Working Method: Token-in-URL**

The ONLY method that works reliably in GitHub Codespaces is embedding the `TEMPLATE_ACCESS_TOKEN` directly in the git remote URL:

```
https://TOKEN@github.com/the-original-body/tob-webapp-stack.git
```

This is implemented in `.claude/scripts/template-sync.sh` in the `setup_upstream()` function.

### For Upstream Issue Creation (`/propose-upstream`, `/retro`)

**Working Method: Export TEMPLATE_ACCESS_TOKEN as GITHUB_TOKEN**

The `propose-upstream.sh` script (used by `/propose-upstream` and `/retro`) needs to create issues in the upstream repo using `gh` CLI. In Codespaces, `GITHUB_TOKEN` is auto-injected but scoped to the current repo only.

The fix (PR #60) adds this at script start:
```bash
if [ -n "${TEMPLATE_ACCESS_TOKEN:-}" ]; then
    export GITHUB_TOKEN="$TEMPLATE_ACCESS_TOKEN"
fi
```

This overrides the Codespaces-injected `GITHUB_TOKEN` so `gh` CLI uses the correct token for upstream operations.

### Why This Works

Token-in-URL bypasses git's credential helper chain entirely. Git sees the credentials embedded in the URL and uses them directly, without consulting any credential helpers.

### Why Credential Helpers Don't Work in Codespaces

1. **Codespaces has a system-level credential helper** at `/etc/gitconfig`:
   ```
   credential.helper=/.codespaces/bin/gitcredential_github.sh
   ```

2. **This system helper always runs first** and provides `GITHUB_TOKEN` credentials

3. **GITHUB_TOKEN is scoped to the current repo**, NOT the upstream template repo

4. **Any credential helper in `~/.gitconfig` runs after** the system helper, but git already got credentials from step 2

5. **Therefore credential helpers we configure are ignored** for the upstream repo

### Failed Approaches (Don't Try These Again)

| PR | Approach | Why It Failed |
|----|----------|---------------|
| #9afd906 | Git credential helpers | System helper takes precedence |
| #47 | SSH agent detection first | SSH_AUTH_SOCK may be set but socket doesn't exist |
| #54 | SSH_AUTH_SOCK mount | Socket doesn't exist on host |

### The Fix (PR #57)

Reverted to token-in-URL approach from commit `ec48ea9`.

## Environment Variables

### TEMPLATE_ACCESS_TOKEN (Required for private repos)

- **Purpose**: GitHub Personal Access Token with read access to `tob-webapp-stack`
- **Set in**: Codespaces secrets, or local environment
- **Used by**: `template-sync.sh` (embedded in URL), `gh` CLI (for `/propose-upstream`)

### TEMPLATE_UPSTREAM (Optional)

- **Purpose**: Override the upstream repository URL
- **Default**: `https://github.com/the-original-body/tob-webapp-stack.git`
- **Used by**: `template-sync.sh`, `post-create.sh`

### GITHUB_TOKEN (Auto-injected in Codespaces)

- **Purpose**: Authentication for current repository operations
- **Limitation**: Does NOT have access to the upstream template repo
- **Used by**: General git operations on the current repo

## Files Involved

| File | Role | Critical Sections |
|------|------|-------------------|
| `.claude/scripts/template-sync.sh` | Template sync | `setup_upstream()` - token-in-URL auth |
| `.devcontainer/post-create.sh` | Container init | Sections 2-4 - auth setup |
| `.devcontainer/devcontainer.json` | Container config | `containerEnv`, `secrets` |
| `.claude/scripts/propose-upstream.sh` | Issue creation | Uses gh CLI with token |

## Testing Authentication

To verify authentication is working:

```bash
# Test template sync
bash .claude/scripts/template-sync.sh --check

# Should show "Updates available from template:" if auth works
# Should show "Warning: Could not fetch upstream" if auth fails
```

## Common Issues

### "Could not fetch upstream. Skipping sync."

**Cause**: Authentication to upstream repo failed.

**Fix**:
1. Ensure `TEMPLATE_ACCESS_TOKEN` is set in Codespaces secrets
2. Ensure the token has read access to `tob-webapp-stack`
3. Rebuild the container to pick up the secret

### "gh: repository not found" for propose-upstream

**Cause**: gh CLI doesn't have write access to upstream repo.

**Fix** (PR #60 makes this automatic):
The `propose-upstream.sh` script now automatically exports `TEMPLATE_ACCESS_TOKEN` as `GITHUB_TOKEN` at startup, so gh CLI uses the correct token. If you still see this error:
1. Ensure `TEMPLATE_ACCESS_TOKEN` is set and has write access to `tob-webapp-stack`
2. Run `/update` to sync the latest script version from upstream

## Adding New Features

If you need to add features that require upstream authentication:

1. **Use token-in-URL for git operations** - Don't use credential helpers
2. **Use gh CLI for GitHub API operations** - Ensure it's authenticated with TEMPLATE_ACCESS_TOKEN
3. **Document the auth requirements** - Add to this file and inline comments
4. **Test in Codespaces** - Local dev environments may work differently
