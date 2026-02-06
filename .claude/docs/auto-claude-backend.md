# Deep Technical Analysis of Auto-Claude Backend Architecture

Auto-Claude is a multi-agent autonomous coding framework built on the **Claude Agent SDK** (not the raw Anthropic API). This analysis dissects the `apps/backend/` Python codebase that powers CLI/headless operation, documenting entry points, agent orchestration, data structures, and integration patterns needed to invoke the system from external wrappers.

---

## Entry points: run.py and spec_runner.py

The backend exposes two primary CLI entry points that orchestrate the entire autonomous coding pipeline.

### run.py — Build execution entry point

This script executes implementation plans against specifications, managing the full agent lifecycle from planning through QA validation.

**CLI argument interface:**
```bash
# Core execution
python run.py --spec 001                    # Run by spec number
python run.py --spec 001-feature-name       # Run by full spec name
python run.py --list                        # List all specs with status

# Iteration control  
python run.py --spec 001 --max-iterations 5 # Limit build iterations
python run.py --spec 001 --skip-qa          # Skip automatic QA validation

# QA operations
python run.py --spec 001 --qa               # Run QA validation manually
python run.py --spec 001 --qa-status        # Check QA status only

# Post-build operations
python run.py --spec 001 --review           # Review changes in worktree
python run.py --spec 001 --merge            # Merge changes to main branch
python run.py --spec 001 --discard          # Discard build/worktree
```

**Initialization sequence:**
1. Path resolution — resolves spec directory from `--spec` argument
2. Environment loading — reads `.env` for `CLAUDE_CODE_OAUTH_TOKEN`, `AUTO_BUILD_MODEL`
3. Spec validation — verifies `spec.md` and `implementation_plan.json` exist
4. Worktree setup — creates git worktree in `.worktrees/auto-claude/` for isolated execution
5. Security profile — loads or creates `.auto-claude-security.json` with stack-based command allowlisting
6. Client creation — instantiates Claude Agent SDK client via `create_client()`

### spec_runner.py — Specification creation orchestrator

This script handles the multi-phase specification creation pipeline before any code is written.

**CLI argument interface:**
```bash
python spec_runner.py --interactive                           # Interactive mode
python spec_runner.py --task "Add user authentication"        # Task description mode
python spec_runner.py --task "Fix button" --complexity simple # Force complexity
python spec_runner.py --continue 001-feature                  # Continue interrupted spec
```

**Complexity detection algorithm** determines pipeline depth:

| Tier | Phases | Detection Criteria |
|------|--------|-------------------|
| **SIMPLE** | 3 | 1-2 files, single service, no external integrations |
| **STANDARD** | 6-7 | 3-10 files, 1-2 services, minimal integrations |
| **COMPLEX** | 8 | 10+ files, multiple services, external API integrations |

---

## Core infrastructure in apps/backend/core/

The `core/` directory contains foundational modules for client management, authentication, security, and project analysis.

### client.py — Claude Agent SDK wrapper

The `create_client()` function is the primary interface for instantiating configured Claude Agent SDK sessions:

```python
from core.client import create_client

client = create_client(
    project_dir=project_dir,           # Path to user's project
    spec_dir=spec_dir,                 # Path to specification directory
    model="claude-sonnet-4-5-20250929",# Claude model (or AUTO_BUILD_MODEL env)
    agent_type="coder",                # planner | coder | qa_reviewer | qa_fixer
    max_thinking_tokens=None           # Extended thinking: None | 5000 | 10000 | 16000
)

# Run agent session
response = client.create_agent_session(
    name="coder-agent-session",
    starting_message="Implement the authentication feature"
)
```

The function configures the Claude Agent SDK with multi-layered security, agent-specific tool permissions, and dynamic MCP server integration based on project capabilities.

### auth.py — OAuth token handling

Authentication uses OAuth tokens obtained from the Claude Code CLI:
- **Required environment variable:** `CLAUDE_CODE_OAUTH_TOKEN`
- **Token acquisition:** `claude setup-token` CLI command
- **Features:** Device code authentication flow, timeout handling, fallback URL display, automatic token save to active profile

### security.py — Three-layer security model

Auto-Claude implements defense-in-depth security:

```
┌─────────────────────────────────────┐
│     Layer 1: OS Sandbox             │
│   (Bash command isolation)          │
├─────────────────────────────────────┤
│     Layer 2: Filesystem Permissions │
│   (Operations restricted to         │
│    project directory)               │
├─────────────────────────────────────┤
│     Layer 3: Command Allowlist      │
│   (Dynamic allowlist from           │
│    project analysis)                │
└─────────────────────────────────────┘
```

Security profiles are cached in `.auto-claude-security.json`. The module uses **PreToolUse hooks** to validate bash commands:

```python
from claude_agent_sdk import ClaudeAgentOptions, HookMatcher

async def check_bash_command(input_data, tool_use_id, context):
    tool_name = input_data["tool_name"]
    command = input_data["tool_input"].get("command", "")
    
    for pattern in block_patterns:
        if pattern in command:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Command blocked: {pattern}",
                }
            }
    return {}

options = ClaudeAgentOptions(
    allowed_tools=["Bash", "Write", "Edit"],
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Bash", hooks=[check_bash_command]),
        ],
    }
)
```

### project_analyzer.py — Stack detection and profile generation

Analyzes project structure to detect technology stack and generate appropriate security profiles:

```json
{
    "project_type": "typescript-react",
    "detected_stack": {
        "languages": ["TypeScript", "JavaScript"],
        "frameworks": ["React", "Next.js"],
        "package_manager": "npm",
        "testing": ["jest", "playwright"]
    },
    "allowed_commands": [
        "npm install", "npm run build", "npm run dev",
        "git status", "git diff", "ls", "grep", "find", "rg"
    ],
    "mcp_servers": ["electron-mcp"]
}
```

---

## Agent architecture in apps/backend/agents/

The agent system follows a multi-session build pattern with specialized agents for planning, coding, and quality assurance.

### Base agent class (agent.py)

All agents inherit shared functionality for session management, state tracking, and inter-agent communication. State management is **file-based**, with progress tracked via `implementation_plan.json` and Git commits.

### Agent execution sequence

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PLANNER AGENT                                            │
│    └── Creates implementation_plan.json with subtasks       │
├─────────────────────────────────────────────────────────────┤
│ 2. CODER AGENT                                              │
│    └── Implements subtasks (can spawn subagents for parallel)│
│    └── Commits changes after each subtask                   │
├─────────────────────────────────────────────────────────────┤
│ 3. QA REVIEWER                                              │
│    └── Validates acceptance criteria                        │
│    └── Can perform E2E testing via Electron MCP             │
├─────────────────────────────────────────────────────────────┤
│ 4. QA FIXER (Loop)                                          │
│    └── Resolves issues reported by QA                       │
│    └── Loops until pass or max iterations (up to 50)        │
├─────────────────────────────────────────────────────────────┤
│ 5. HUMAN REVIEW                                             │
│    └── User reviews changes in worktree                     │
│    └── Merge, discard, or provide feedback                  │
└─────────────────────────────────────────────────────────────┘
```

### Planner agent (planner_agent.py)

Reads the completed spec and generates a subtask-based implementation plan with dependencies.

**Output format — implementation_plan.json:**
```json
{
  "spec_id": "001-feature-name",
  "feature": "Feature Title",
  "subtasks": [
    {
      "id": "subtask-1",
      "title": "Setup database schema",
      "description": "Create migration files for new tables",
      "dependencies": [],
      "status": "pending",
      "files": ["migrations/001_create_users.sql"],
      "estimated_complexity": "low"
    },
    {
      "id": "subtask-2",
      "title": "Implement API endpoints",
      "description": "Create REST endpoints for user management",
      "dependencies": ["subtask-1"],
      "status": "pending",
      "files": ["src/routes/users.ts", "src/controllers/users.ts"],
      "estimated_complexity": "medium"
    }
  ],
  "metadata": {
    "created_at": "2025-01-01T00:00:00Z",
    "complexity_tier": "standard",
    "total_subtasks": 5,
    "completed_subtasks": 0
  }
}
```

### Coder agent (coder_agent.py)

Implements subtasks from the plan, respecting dependency ordering. Key behaviors:
- **Subagent spawning:** Can spawn parallel subagents for independent subtasks
- **Git operations:** All changes committed atomically per subtask
- **Commit format:** `auto-claude: subtask-1-1 - Add feature X`
- **Worktree isolation:** Works in `.worktrees/auto-claude/` branch

### QA validation loop (qa_agent.py, qa_fixer.py)

The QA system implements a self-healing validation loop:

```
┌─────────────┐
│ Coding Done │
└──────┬──────┘
       ▼
┌─────────────┐
│ QA Reviewer │◄────────────────┐
└──────┬──────┘                 │
   ┌───┴───┐                    │
  PASS    FAIL                  │
   │        │                   │
   │        ▼                   │
   │   ┌─────────┐              │
   │   │QA Fixer │──────────────┘
   │   └─────────┘ (up to 50 iterations)
   ▼
┌──────────────┐
│ Human Review │
└──────────────┘
```

**Exit conditions:**
1. All acceptance criteria pass → Success
2. Maximum iterations reached → Human intervention required
3. User intervention via `PAUSE` file or `HUMAN_INPUT.md`

**E2E testing via Electron MCP** (for frontend changes):
```python
# Screenshot capture
mcp__electron__take_screenshot

# UI interaction
mcp__electron__send_command_to_electron(command="click_by_text", args={"text": "Submit"})
mcp__electron__send_command_to_electron(command="fill_input", args={"placeholder": "Email", "value": "test@example.com"})
```

Screenshots are automatically compressed to **1280x720, quality 60, JPEG** to stay under Claude SDK's 1MB JSON message buffer limit.

---

## Spec agents in apps/backend/spec_agents/

The spec creation pipeline uses specialized agents for each phase.

### Dynamic phase pipeline (3-8 phases)

| Phase | Agent | Purpose | Output |
|-------|-------|---------|--------|
| **Discovery** | Discovery Agent | Analyzes project structure/tech stack | Project context |
| **Requirements** | Requirements Agent | Gathers requirements via conversation | `requirements.json` |
| **Research** | Research Agent | Validates external integrations | Research findings |
| **Context** | Context Discovery Agent | Finds relevant codebase files | `context.json` |
| **Spec Writer** | Spec Writer Agent | Creates specification document | `spec.md` |
| **Spec Critic** | Critic Agent | Self-critique with extended thinking | Spec improvements |
| **Planner** | Planner Agent | Creates subtask breakdown | `implementation_plan.json` |
| **Validation** | Validation Agent | Validates all outputs | Ready status |

**Pipeline by complexity:**
```
SIMPLE:   Discovery → Quick Spec → Validate
STANDARD: Discovery → Requirements → [Research] → Context → Spec → Plan → Validate
COMPLEX:  Discovery → Requirements → Research → Context → Spec → Critic → Plan → Validate
```

### spec.md output format

```markdown
# Feature: [Feature Title]

## Overview
[Brief description of what this feature does]

## Requirements
- [Requirement 1]
- [Requirement 2]

## Technical Details
[Implementation details, architecture decisions]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Files to Modify/Create
- `path/to/file.ts` - Description
- `path/to/new-file.ts` - Description

## Dependencies
- External: [APIs, libraries]
- Internal: [Other features, modules]
```

---

## Prompt system in apps/backend/prompts/

Prompt templates are stored as markdown files and loaded per agent type.

### Prompt template catalog

| File | Purpose |
|------|---------|
| `spec_gatherer.md` | Collects user requirements through conversation |
| `spec_researcher.md` | Validates external integrations against docs |
| `spec_writer.md` | Creates the spec.md document |
| `spec_critic.md` | Self-critique using extended thinking |
| `complexity_assessor.md` | AI-based complexity assessment |
| `planner.md` | Creates implementation plan with subtasks |
| `coder.md` | Implements individual subtasks |
| `coder_recovery.md` | Recovers from stuck/failed subtasks |
| `qa_reviewer.md` | Validates acceptance criteria |
| `qa_fixer.md` | Fixes QA-reported issues |

Prompts are loaded based on `agent_type` parameter passed to `create_client()`, with context injection including project discovery, requirements, codebase context, and memory layer insights.

---

## Integration layer in apps/backend/integrations/

### Graphiti memory layer

Auto-Claude uses **Graphiti** with embedded **LadybugDB** (no Docker required as of v2.7.2) for cross-session context retention.

```python
from integrations.graphiti.memory import get_graphiti_memory

memory = get_graphiti_memory(spec_dir, project_dir)

# Query relevant context before starting work
context = memory.get_context_for_session("Implementing feature X")

# Store insights discovered during session
memory.add_session_insight("Pattern: use React hooks for state")
memory.add_session_insight("Gotcha: API requires auth header")
```

**LLM/Embedding provider support:**

| Provider | Type | Notes |
|----------|------|-------|
| OpenAI | LLM + Embeddings | Default (gpt-4.1, text-embedding-3-small) |
| Google AI (Gemini) | LLM + Embeddings | gemini-2.0-flash |
| Anthropic | LLM only | Claude models |
| Ollama | LLM + Embeddings | **Offline operation** |
| Sentence Transformers | Embeddings | Local (all-MiniLM-L6-v2) |

### GitHub integration

Git worktrees provide isolated development environments:
```
main (user's branch)
└── auto-claude/{spec-name}  ← spec branch (isolated worktree)
```

**All branches stay LOCAL** until explicit push. Commit messages include:
```
🤖 Generated with Claude Code
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**AI merge conflict resolution:** When main branch evolves during builds, the system provides conflict-only context to AI (~98% prompt reduction), parallel processing of multiple conflicting files, and syntax validation before applying.

### Linear integration

Task management connection via GraphQL API:
- Import tasks from Linear projects
- Two-way status synchronization
- Task → Spec mapping stored in `.auto-claude/specs/{task-id}/`

---

## Human intervention mechanisms

### PAUSE file mechanism

Create a `PAUSE` file to pause execution after the current session:
```bash
touch specs/001-name/PAUSE
```

### HUMAN_INPUT.md injection

Inject instructions mid-execution:
```bash
echo "Focus on fixing the login bug first" > specs/001-name/HUMAN_INPUT.md
```

The file is read at session boundaries, injected as starting context for the next session, then deleted.

---

## Spec directory structure

```
.auto-claude/
├── specs/
│   └── 001-feature-name/
│       ├── spec.md                    # Feature specification
│       ├── requirements.json          # Structured user requirements
│       ├── context.json               # Discovered codebase context
│       ├── implementation_plan.json   # Subtask plan with status
│       ├── qa_report.md               # QA validation results
│       ├── QA_FIX_REQUEST.md          # Issues to fix (when rejected)
│       ├── PAUSE                      # Presence = pause request
│       └── HUMAN_INPUT.md             # Human guidance injection
├── roadmap/                           # Project roadmap
├── ideation/                          # Ideas and planning
└── memories/                          # Graph memory data (LadybugDB)

.worktrees/
└── auto-claude/                       # Isolated workspace per spec

.auto-claude-security.json             # Cached security profile
```

---

## Configuration and environment

### Required environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | **Yes** | OAuth token from `claude setup-token` |

### Optional environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTO_BUILD_MODEL` | Override Claude model | `claude-sonnet-4-5-20250929` |
| `GRAPHITI_ENABLED` | Enable memory layer | `true` (v2.7.2+) |
| `GRAPHITI_LLM_PROVIDER` | Memory LLM provider | `openai` |
| `GRAPHITI_EMBEDDER_PROVIDER` | Embedding provider | `openai` |
| `OPENAI_API_KEY` | Required for OpenAI memory provider | — |
| `LINEAR_API_KEY` | Linear API key for task sync | — |
| `GITLAB_TOKEN` | GitLab Personal Access Token | — |
| `GITLAB_INSTANCE_URL` | GitLab instance URL | `gitlab.com` |

### Critical dependencies

From `requirements.txt`:
- **claude-agent-sdk>=0.1.16** — Core SDK (requires Python 3.10+)
- Graphiti/LadybugDB — Memory layer
- Standard Python libraries for async, JSON, file operations

---

## Module dependency graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    run.py / spec_runner.py                      │
│                    (CLI Entry Points)                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       core/client.py                            │
│                  (Claude Agent SDK Wrapper)                     │
│   • create_client() factory function                            │
│   • Session management                                          │
│   • Security hook integration                                   │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌────────────────┐  ┌─────────────────┐  ┌────────────────────┐
│  core/auth.py  │  │core/security.py │  │core/project_       │
│                │  │                 │  │   analyzer.py      │
│ • OAuth tokens │  │ • PreToolUse    │  │ • Stack detection  │
│ • Token refresh│  │   hooks         │  │ • Profile generation│
└────────────────┘  │ • Allowlisting  │  └────────────────────┘
                    └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        agents/*.py                              │
│   • agent.py (base class)                                       │
│   • planner_agent.py → implementation_plan.json                 │
│   • coder_agent.py → code changes + commits                     │
│   • qa_agent.py / qa_fixer.py → validation loop                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     integrations/*.py                           │
│   • graphiti/ → cross-session memory                            │
│   • github/ → PR creation, branch management                    │
│   • linear/ → task synchronization                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## External wrapper invocation guide

To invoke Auto-Claude from an external script:

```python
import subprocess
import os

# 1. Set required environment
os.environ["CLAUDE_CODE_OAUTH_TOKEN"] = "your-token-here"

# 2. Create spec programmatically
result = subprocess.run([
    "python", "spec_runner.py",
    "--task", "Add user authentication with OAuth",
    "--complexity", "standard"
], cwd="apps/backend", capture_output=True)

# 3. Get spec ID from output (e.g., "001-add-authentication")
spec_id = parse_spec_id(result.stdout)

# 4. Run autonomous build
subprocess.run([
    "python", "run.py",
    "--spec", spec_id,
    "--max-iterations", "10"
], cwd="apps/backend")

# 5. Review and merge
subprocess.run(["python", "run.py", "--spec", spec_id, "--merge"], cwd="apps/backend")
```

**Key gotchas for external integration:**
- Always use Python 3.12+ (claude-agent-sdk requires 3.10+, but 3.12 is recommended)
- Project must be a Git repository for worktree isolation
- Security profile regenerates if project structure changes significantly
- Memory layer is enabled by default — disable with `GRAPHITI_ENABLED=false` if external provider not configured
- The QA loop can run up to 50 iterations; consider `--skip-qa` for faster iteration during development
- All work stays LOCAL until explicit `--merge` or manual push