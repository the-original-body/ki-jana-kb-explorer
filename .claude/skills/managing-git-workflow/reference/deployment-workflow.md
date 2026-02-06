# Deployment Workflow

## Environment Overview

```
push to preview/* ──► Preview  ──► app-preview.tob.sh
                      (experimental, short-lived)

PR merged to main ──► Staging  ──► app-staging.tob.sh
                      (next release candidate)

GitHub Release ─────► Production ► app.tob.sh
(tag v*)              (live)
```

## Environment Mapping

| Trigger | Environment | URL Pattern | Purpose |
|---------|-------------|-------------|---------|
| Push to `preview/*` | Preview | `{app}-preview.tob.sh` | Experiment & test |
| PR merged to `main` | Staging | `{app}-staging.tob.sh` | QA before release |
| GitHub Release (`v*`) | Production | `{app}.tob.sh` | Live traffic |

## Branch Strategy

| Branch | Purpose | Direct Push |
|--------|---------|-------------|
| `main` | Protected, source of truth | No (PR only) |
| `feat/<slug>` | Feature development | Yes |
| `fix/<slug>` | Bug fixes | Yes |
| `preview/*` | Short-lived experiments | Yes |

No long-lived staging/production branches. Main = staging state, tags = production state.

## Typical Flow

```
1. Create feature branch from main
   git checkout main && git pull
   git checkout -b feat/new-feature

2. Push to preview (optional, for early feedback)
   git push origin preview/new-feature
   → Deploys to app-preview.tob.sh

3. Open PR, get review, merge to main
   → Deploys to app-staging.tob.sh
   → Delete feature branch

4. QA on Staging

5. Create GitHub Release
   → Deploys to app.tob.sh
```

## Releasing to Production

### Via GitHub UI (Recommended)

1. Go to **Releases** → **Create new release**
2. Click **Choose a tag** → type `v1.0.0` → **Create new tag**
3. Add release title and notes
4. Click **Publish release**

### Via Command Line

```bash
git checkout main
git pull
git tag v1.0.0
git push origin v1.0.0
```

## Version Convention

| Version | Type | When to Use |
|---------|------|-------------|
| `v1.0.0` | Major | Breaking changes |
| `v1.1.0` | Minor | New features (backward compatible) |
| `v1.1.1` | Patch | Bug fixes |

## Why This Architecture

- **Single Source of Truth**: `main` always reflects staging state
- **No Divergence**: Production is always a tagged commit from main
- **Easy Rollbacks**: Redeploy previous tag (no commit reverts needed)
- **Short-lived Branches**: Minimize divergence from main
- **Explicit Releases**: Production only updates when you decide
