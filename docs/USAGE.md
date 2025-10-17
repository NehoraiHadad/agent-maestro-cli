# AgentMaestro Usage Guide

## Installation

### Prerequisites

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18 or higher
   ```

2. **Install AgentMaestro**
   ```bash
   cd /path/to/AgentMaestro
   npm install
   npm link  # Makes 'maestro' command globally available
   ```

3. **Install at least one AI CLI tool**
   ```bash
   # Claude Code
   npm install -g @anthropic-ai/claude-code

   # Gemini CLI
   npm install -g @google/gemini-cli

   # OpenAI Codex
   npm install -g @openai/codex
   ```

## Quick Start

### Basic Usage

1. **Interactive Mode** (Recommended for first-time users)
   ```bash
   maestro
   ```
   This will show an interactive menu to select your primary agent.

2. **Direct Mode**
   ```bash
   maestro --agent claude
   maestro --agent gemini
   maestro --agent codex
   ```

### Example Session

```bash
$ maestro --agent claude

🎭 Agent Maestro
═══════════════════════════════════════
ℹ Primary agent: Claude Code
ℹ Available for delegation: gemini, codex
═══════════════════════════════════════

🎭 [Maestro] Delegation Protocol:
  Primary agent can delegate tasks using:
  MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "task description"}

═══════════════════════════════════════

> Build me a Flask todo app

[Claude Code responds...]
[If Claude decides to delegate, you'll see:]

🎭 [Maestro] Delegating to gemini
  ↳ [Gemini CLI] Starting task
  ✓ Gemini CLI completed task (3.2s)

[Results are sent back to Claude...]
```

## Commands

### `maestro` (Main Command)

Start orchestration with a primary agent.

**Options:**
```bash
-a, --agent <name>      Specify primary agent (claude, gemini, codex)
-v, --verbose           Enable verbose logging
--no-spinner           Disable loading spinners
--timeout <ms>         Delegation timeout in milliseconds (default: 60000)
--max-depth <n>        Maximum delegation depth (default: 3)
```

**Examples:**
```bash
# Interactive selection
maestro

# With specific agent
maestro --agent gemini

# Verbose mode
maestro --agent claude --verbose

# Custom timeout and depth
maestro --agent codex --timeout 120000 --max-depth 5
```

### `maestro list`

List all available agents and their installation status.

```bash
$ maestro list

🎭 Available Agents
═══════════════════════════════════════

Claude Code ✓ installed
  Anthropic Claude - Best for codebase navigation, refactoring, and architectural decisions
  Package: @anthropic-ai/claude-code
  Command: claude

Gemini CLI ✓ installed
  Google Gemini - Best for automation, web search, and content generation
  Package: @google/gemini-cli
  Command: gemini

OpenAI Codex ✗ not installed
  OpenAI Codex - Best for code generation, completion, and pair programming
  Package: @openai/codex
  Command: codex
```

### `maestro info <agent>`

Show detailed information about a specific agent.

```bash
$ maestro info claude

🎭 Claude Code
═══════════════════════════════════════

Description:
  Anthropic Claude - Best for codebase navigation, refactoring, and architectural decisions

Status:
  ✓ Installed

Package:
  @anthropic-ai/claude-code

Command:
  claude

Capabilities:
  • Code refactoring
  • Codebase analysis
  • Architectural planning
  • File editing
  • MCP integration

Authentication:
  Claude Pro/Max subscription
```

## Delegation Protocol

### For Primary Agents

If you're instructing the primary agent (e.g., Claude Code) to use delegation:

**Format:**
```
MAESTRO_DELEGATE::{"agent": "<name>", "prompt": "<task>"}
```

**Fields:**
- `agent` (required): Target agent name (claude, gemini, codex)
- `prompt` (required): Task description for secondary agent
- `priority` (optional): low, normal, high (default: normal)
- `timeout` (optional): Custom timeout in milliseconds

### Example Prompts

**Direct the primary agent to delegate:**

```
"You are working with Maestro. To delegate a task, output:
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "search for Flask security best practices"}

Now, please create a Flask app and use Gemini to research security best practices."
```

**More examples:**

```javascript
// Research task to Gemini
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Find the latest React 19 features"}

// Code generation to Codex
MAESTRO_DELEGATE::{"agent": "codex", "prompt": "Generate unit tests for the User model"}

// Analysis task to Claude
MAESTRO_DELEGATE::{"agent": "claude", "prompt": "Refactor the authentication module"}
```

## Real-World Workflows

### Workflow 1: Full-Stack App Development

**Scenario:** Build a todo app with Flask backend

**Primary Agent:** Claude Code (for planning and architecture)

**User Prompt:**
```
"Create a Flask todo app with the following:
1. First, plan the architecture
2. Use Codex to generate the boilerplate code
3. Use Gemini to find and integrate best practices for Flask security
4. Review and refactor the final code"
```

**Expected Flow:**
```
Claude → Plans architecture
      → MAESTRO_DELEGATE to Codex for code generation
      → MAESTRO_DELEGATE to Gemini for security research
      → Reviews and refactors
```

### Workflow 2: Debugging Complex Issue

**Primary Agent:** Gemini (for web research)

**User Prompt:**
```
"I'm getting a CORS error in my React app.
Search for solutions, then ask Codex to implement the fix."
```

**Expected Flow:**
```
Gemini → Searches for CORS solutions
       → MAESTRO_DELEGATE to Codex to implement fix
       → Returns complete solution
```

### Workflow 3: Code Review & Testing

**Primary Agent:** Claude (for review)

**User Prompt:**
```
"Review the code in src/auth.js and:
1. Identify issues
2. Ask Codex to write tests
3. Ask Gemini to check for security vulnerabilities"
```

**Expected Flow:**
```
Claude → Reviews code
       → MAESTRO_DELEGATE to Codex for tests
       → MAESTRO_DELEGATE to Gemini for security check
       → Provides comprehensive report
```

## Advanced Usage

### Environment Variables

```bash
# Set delegation timeout globally
export MAESTRO_TIMEOUT=120000

# Set max depth
export MAESTRO_MAX_DEPTH=5

# Enable debug mode
export MAESTRO_DEBUG=true
```

### Configuration File (Future)

Create `~/.maestro/config.json`:

```json
{
  "defaultAgent": "claude",
  "timeout": 90000,
  "maxDepth": 4,
  "showSpinner": true,
  "verbose": false
}
```

## Troubleshooting

### Agent Not Found

**Error:**
```
✗ Agent "claude" is not installed
```

**Solution:**
```bash
npm install -g @anthropic-ai/claude-code
```

### Delegation Timeout

**Error:**
```
⚠ Delegation to gemini timed out
```

**Solutions:**
1. Increase timeout: `maestro --agent claude --timeout 120000`
2. Check if secondary agent is responsive: `gemini --version`

### Maximum Depth Exceeded

**Error:**
```
✗ Maximum delegation depth (3) exceeded
```

**Cause:** Infinite delegation loop (A delegates to B, B delegates to A)

**Solution:**
1. Increase max depth if legitimate: `--max-depth 5`
2. Review delegation logic to prevent loops

### PTY Process Error

**Error:**
```
✗ Failed to spawn process
```

**Solutions:**
1. Ensure agent CLI is installed
2. Check agent is in PATH: `which claude`
3. Verify Node.js version: `node --version` (should be 18+)

## Tips & Best Practices

### 1. Choose the Right Primary Agent

- **Claude**: Best for complex planning and refactoring
- **Gemini**: Best when you need web search capabilities
- **Codex**: Best for pure code generation tasks

### 2. Clear Delegation Instructions

Good:
```
"Use Gemini to search for React performance optimization techniques"
```

Bad:
```
"Find stuff about React"
```

### 3. Avoid Deep Nesting

Keep delegation chains shallow (1-2 levels) for best performance.

### 4. Use Verbose Mode for Debugging

```bash
maestro --agent claude --verbose
```

### 5. Monitor Resource Usage

Each agent process consumes memory. Don't run too many parallel delegations.

## Keyboard Shortcuts

- `Ctrl+C` - Exit Maestro (cleanly terminates all processes)
- `Ctrl+D` - EOF signal to primary agent
- Any input - Passed directly to primary agent

## Getting Help

- View this guide: `maestro --help`
- List agents: `maestro list`
- Agent info: `maestro info <name>`
- GitHub Issues: [Report bugs](https://github.com/yourusername/AgentMaestro/issues)
