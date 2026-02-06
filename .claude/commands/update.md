# Update from Template

Pull the latest updates from the upstream CAPS template repository using safe selective sync.

## How It Works

The sync is controlled by `.caps-sync.yml` which defines three ownership categories:

| Category | Behavior | Examples |
|----------|----------|----------|
| **Template Owned** | Always overwritten from upstream | `.claude/**`, `.devcontainer/Dockerfile` |
| **Shared** | Smart merge preserves both sides | `.gitmodules`, `CLAUDE.md`, `devcontainer.json` |
| **App Owned** | Never touched | `src/**`, `wrangler.toml`, `package.json` |

## Instructions

1. Run the sync script:
   ```bash
   bash .claude/scripts/template-sync.sh
   ```

2. The script will:
   - Fetch latest from upstream template
   - Overwrite template-owned files
   - Smart-merge shared files (preserving your additions)
   - Delete files removed from template
   - Skip all app-owned files (your code is safe)
   - Commit the changes automatically

3. After sync, summarize:
   - Which files were updated
   - Which files were deleted
   - Any merge results for shared files

## Check Mode (Dry Run)

To preview changes without applying:
```bash
bash .claude/scripts/template-sync.sh --check
```

## Ownership Details

### Template Owned (always overwritten)
- `.claude/commands/**` - Slash commands
- `.claude/scripts/**` - Automation scripts
- `.claude/skills/**` - Skills and patterns
- `.claude/settings.json` - Permissions and hooks
- `.devcontainer/Dockerfile`, `post-create.sh`, `post-start.sh`
- `.github/workflows/caps-*.yml` - CAPS CI workflows

### Shared (merge strategies)
- `.gitmodules` - Template submodules added, yours preserved (additive)
- `CLAUDE.md` - Template's "## CAPS Base" section updated, your content preserved (section)
- `.devcontainer/devcontainer.json` - Deep merge, your customizations win conflicts

### App Owned (never touched)
- `src/**`, `app/**`, `api/**` - Your application code
- `wrangler.toml` - Your Cloudflare config
- `package.json`, `README.md` - Your project files
- `.env*` - Your secrets
