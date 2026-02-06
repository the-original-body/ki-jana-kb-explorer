# TOB Webapp Stack

A template repository for building web applications using the CAPS (Claude-Assisted Product Specification) workflow.

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (for npm)

### Local Development Setup

Run the setup script after cloning:

```bash
./setup-host.sh
```

This will:
1. Install the `devcontainer` CLI (if not already installed)
2. Start Docker Desktop (if not running)
3. Add shell aliases to your `.zshrc`/`.bashrc`
4. Build and start the devcontainer

### Daily Workflow

After setup, use these commands from the project directory:

| Command | Description |
|---------|-------------|
| `devup` | Start everything (Docker + container + shell). Use if container is stopped. |
| `devsh` | Open a shell in the running container. Fast, use for additional terminals. |

**Example:**
```bash
# First terminal - start the container
cd ~/Projects/tob-webapp-stack
devup

# Additional terminals - just open a shell
cd ~/Projects/tob-webapp-stack
devsh
```

### Multiple Projects

The aliases work per-directory. Each project with a `.devcontainer` folder gets its own isolated container:

```bash
# Terminal 1 - Project A
cd ~/Projects/project-a
devup

# Terminal 2 - Project B
cd ~/Projects/project-b
devup

# Both containers run simultaneously
```

### GitHub Codespaces

This repository also works with GitHub Codespaces. Just click "Code" → "Codespaces" → "Create codespace on main".

## CAPS Workflow

This template uses the CAPS workflow for building features:

1. **Discovery** - Chat to explore requirements
2. **Definition** - Run `/design` to create a PRD
3. **Breakdown** - Run `/breakdown` to create GitHub Issues
4. **Implementation** - Run `/build` to implement

See [CLAUDE.md](./CLAUDE.md) for detailed instructions.
