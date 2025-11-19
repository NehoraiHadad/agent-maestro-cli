# 🎭 AgentMaestro

**Simplified orchestrator for Claude Code with enhanced features**

AgentMaestro provides a streamlined interface for Claude Code with built-in Plan Mode support and intelligent delegation capabilities through Claude Code's native Subagents system.

> **How it works**: Claude Code is always the primary agent. When tasks benefit from specialized capabilities, Claude can delegate to specialized subagents (`codex-delegator` for fast code generation, `gemini-delegator` for research and automation). These subagents run the actual Codex/Gemini CLIs and return results to Claude. This gives you the best of all three agents automatically.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

## ✨ Features

- 🎯 **Claude Code Enhanced** - Optimized interface for Claude Code as primary agent
- 📋 **Plan Mode Support** - Enable planning mode for research without execution
- 🔄 **Smart Delegation** - Claude delegates to Codex/Gemini subagents when beneficial
- 🎓 **Skills Integration** - Enhanced delegation through native Skills system
- 🚀 **Zero Configuration** - Works with existing Claude Code installation
- 💬 **Interactive Mode** - Clean, user-friendly interface
- 🔧 **Session Continuity** - Maintains conversation context across interactions
- 💾 **Session Persistence** - Save, load, and export conversation sessions
- 📊 **Rich Logging** - Beautiful terminal output with progress indicators
- 🔍 **Live Detection** - Real-time monitoring when Claude Code uses subagents

## Recent Improvements (v2.1.0)

### 🔒 Security Enhancements
- **Fixed Command Injection vulnerability** in command availability checks
- **Cryptographically secure Session IDs** using `crypto.randomUUID()`
- **Improved input validation** across all user-facing interfaces

### 🏗️ Architecture Improvements
- **Dependency Injection support** for better testability
- **SessionIdExtractor** - dedicated class for session ID parsing
- **Graceful shutdown** for PTY processes (SIGTERM → SIGKILL)
- **Modular design** with clear separation of concerns

### 🚀 New Features
- **Enhanced TypeScript types** with strict mode compliance

### 📊 Code Quality
- **100% TypeScript tests** (migrated from JavaScript)
- **Comprehensive JSDoc documentation** for public APIs
- **Centralized constants** (no more magic numbers)
- **Improved error messages** with troubleshooting tips

## 🎬 Quick Demo

```bash
$ maestro

🎭 Starting AgentMaestro with Claude Code
═══════════════════════════════════════

> Build a Flask todo app with security best practices

[Claude analyzes the request...]
🔄 [Live] Delegating to Codex subagent...
  ✓ [Live] Subagent completed

[Claude incorporates Codex's implementation...]
🔄 [Live] Delegating to Gemini subagent...
  ✓ [Live] Subagent completed

[Final implementation ready!]
```

### Plan Mode Example

```bash
$ maestro --plan-mode

📋 Plan Mode enabled - Claude will research and plan without executing changes
═══════════════════════════════════════

> Refactor the authentication module

[Claude researches and creates a detailed plan...]
[No files are modified until you approve the plan]
```

## 🏗️ Architecture: Pure Wrapper Design

**Important:** AgentMaestro is a **pure wrapper** for Claude Code. It does NOT provide direct CLI access to Codex or Gemini.

### How Multi-Agent Workflows Work

```
┌─────────────────────────────────────────┐
│  You run: maestro                       │
│  ↓                                      │
│  AgentMaestro launches Claude Code      │
│  ↓                                      │
│  Claude analyzes your request           │
│  ↓                                      │
│  Claude may spawn Subagents:            │
│    • codex-delegator (for code gen)     │
│    • gemini-delegator (for research)    │
│  ↓                                      │
│  Subagents run actual Codex/Gemini CLIs │
│  ↓                                      │
│  Results return to Claude               │
│  ↓                                      │
│  Claude provides final response         │
└─────────────────────────────────────────┘
```

### Why This Design?

1. **Simplicity** - Less code, fewer bugs
2. **Leverage Claude Code's power** - Use native Subagent system
3. **Automatic delegation** - Claude decides when to use each agent
4. **Consistent experience** - All interactions through Claude's interface

### ⚠️ What This Means for You

- ✅ **Do this:** `maestro` (starts Claude, which can delegate to others)
- ✅ **Do this:** `maestro delegate claude "task"` (direct Claude access)
- ❌ **Don't do this:** `maestro delegate codex "task"` (not supported - use Claude's Subagents)
- ❌ **Don't do this:** `maestro delegate gemini "task"` (not supported - use Claude's Subagents)

**To use Codex/Gemini:** Just ask Claude naturally! Claude will delegate automatically via Subagents.

## 📦 Installation

### Prerequisites

- Node.js 18+
- [Claude Code](https://claude.ai/code) - Required (primary agent)
- [Gemini CLI](https://ai.google.dev/gemini-api/docs/cli) - Optional (for delegation)
- [OpenAI Codex](https://openai.com/codex) - Optional (for delegation)

**Note**: While only Claude Code is required to run AgentMaestro, installing Gemini CLI and Codex enables Claude to delegate tasks to them for optimal results.

### Install AgentMaestro

```bash
# Clone the repository
git clone https://github.com/yourusername/AgentMaestro.git
cd AgentMaestro

# Install dependencies
npm install

# Build the project
npm run build

# Link globally
npm link

# Verify installation
maestro --version
```

### Install AI Agents

```bash
# Required: Install Claude Code
npm install -g @anthropic-ai/claude-code

# Optional but recommended: Install delegation targets
npm install -g @google/gemini-cli
npm install -g @openai/codex

# Verify installations
claude --version
gemini --version  # if installed
codex --version   # if installed
```

### Initialize AgentMaestro (First Time Setup)

```bash
# Initialize Claude Code integration
maestro init

# This will:
# 1. Run claude init (if .claude/ doesn't exist)
# 2. Register the bundled AgentMaestro plugin marketplace
# 3. Install the maestro-delegation-suite plugin (commands, agents, skills)
```

## 🧩 Claude Code Plugin

AgentMaestro distributes its Claude Code extensions (commands, agents, Skills, hooks) as a first-class plugin. The repository includes:

- Marketplace manifest: `.claude-plugin/marketplace.json`
- Plugin package: `plugins/maestro-delegation-suite/`

`maestro init` wires these up automatically, but you can also install them manually:

```bash
# Add the AgentMaestro marketplace (local folder or Git repo)
claude plugin marketplace add /path/to/AgentMaestro

# Install just the delegation plugin
claude plugin install maestro-delegation-suite@agent-maestro
```

Once installed, open `/plugin` inside Claude Code to verify the plugin is enabled.

## 🎓 AgentMaestro Skills (Optional but Recommended)

AgentMaestro includes a **delegation advisor skill** that teaches Claude Code when and how to delegate tasks intelligently. This dramatically improves delegation decisions!

### What are Skills?

Skills are modular capabilities introduced by Anthropic that extend Claude Code's intelligence. The `maestro-delegation-advisor` skill provides Claude with:

- **Agent capability matrix** - Detailed strengths/weaknesses of each agent
- **Decision framework** - When to delegate and to which agent
- **Real-world examples** - Proven delegation patterns
- **Performance benchmarks** - SWE-bench, HumanEval scores

### Benefits

- ✅ **Smarter delegation decisions** - Claude chooses the right agent automatically
- ✅ **Better task breakdown** - Optimal parallel vs sequential delegation
- ✅ **Context-efficient** - Only loads when needed (~50 tokens overhead)
- ✅ **Zero code changes** - Works with existing AgentMaestro setup

### Installation

```bash
# Install the delegation advisor skill
maestro skills install

# Check installation status
maestro skills status

# (Optional) Uninstall
maestro skills uninstall
```

> **Note:** `maestro init` now installs this skill automatically through the bundled Claude Code plugin. Use the manual commands above only if you need to reinstall or troubleshoot.

When the plugin is enabled, Claude loads the skill directly from `plugins/maestro-delegation-suite/skills/maestro-delegation-advisor/` (you can confirm the enablement flag inside `~/.claude/settings.json`).

### How it Works

The skill integrates with Claude Code's native Subagent system:

1. **User requests a task** through AgentMaestro
2. **Claude Code analyzes** using the delegation advisor skill
3. **Skill recommends** the best subagent (codex-delegator or gemini-delegator) based on task type
4. **Claude spawns a subagent** - a specialized Claude instance that runs the actual CLI tool
5. **Subagent executes** the Codex/Gemini CLI command and captures output
6. **AgentMaestro detects** and displays delegation in real-time
7. **Subagent returns results** to Claude in isolated context (separate 200k context window)
8. **Claude incorporates result** into final response

### When to Use

**Highly recommended** for optimal delegation:
- Helps Claude make smarter decisions about when to delegate
- Provides context about Codex and Gemini capabilities
- Improves task breakdown and parallel delegation

**Requirements for delegation to work:**
- Gemini CLI and/or Codex must be installed
- Without them, Claude will still work but won't be able to delegate
- Skill helps Claude decide IF and WHEN to delegate (assuming agents are installed)

For more details, see: [`plugins/maestro-delegation-suite/skills/maestro-delegation-advisor/SKILL.md`](plugins/maestro-delegation-suite/skills/maestro-delegation-advisor/SKILL.md)

## 🚀 Usage

### Basic Usage

```bash
# Interactive mode (recommended)
maestro

# Plan mode - research and plan without execution
maestro --plan-mode

# Single message mode
maestro -m "explain this codebase"

# Plan mode with single message
maestro --plan-mode -m "plan a refactoring of the auth module"
```

### Direct Delegation (One-Shot Tasks)

Execute Claude Code in one-shot mode for quick tasks:

```bash
# Quick task with Claude
maestro delegate claude "perform security audit of the authentication system"

# One-shot code generation (Claude may delegate to Codex via Subagents)
maestro delegate claude "implement user authentication with JWT"

# One-shot research (Claude may delegate to Gemini via Subagents)
maestro delegate claude "research best practices for React state management in 2025"
```

**When to use direct delegation:**
- Quick, isolated tasks that don't need conversation context
- CI/CD pipelines or automation scripts
- Single-command operations

**Difference from interactive mode:**
- Interactive (`maestro`): Multi-turn conversation with session continuity
- Direct (`maestro delegate claude`): Single task, one-shot execution

**Note:** Codex and Gemini are accessed via Claude Code's Subagent system, not directly through AgentMaestro.

### Slash Commands (Within Claude Code Session)

When running in interactive mode, you can use Claude Code's native slash commands. For delegation, simply ask Claude naturally:

```bash
# Within a Claude Code session - just ask naturally!
> Can you use Codex to build the API endpoints quickly?
> Search for the latest TypeScript best practices

# Claude will automatically delegate to Subagents as needed
```

### Session Persistence

AgentMaestro supports saving and loading conversation sessions for later review or continuation.

#### Interactive Session Commands

```bash
# Within a Claude Code session:
/save [name]           # Save current session with optional name
/sessions              # List all saved sessions
/load <sessionId>      # Load a saved session (view info)
/session-info          # Display current session information
```

#### CLI Commands

```bash
# List all saved sessions
maestro --list-sessions

# Export session to JSON
maestro --export <sessionId> json > session.json

# Export session to Markdown
maestro --export <sessionId> markdown > session.md

# Delete a saved session
maestro --delete-session <sessionId>
```

#### Session Storage

Sessions are stored in `~/.maestro/sessions/` and include:
- Complete conversation history
- Message metadata (timestamps, agent info)
- Session statistics (duration, message counts)
- Optional tags and custom names

**Example workflow:**

```bash
$ maestro
> Build a user authentication system

# After working on the task...
> /save auth-implementation

# Later, view saved sessions
$ maestro --list-sessions

# Export for documentation
$ maestro --export session_abc123 markdown > auth-session.md
```

### List Available Agents

```bash
maestro list
```

### Get Agent Info

```bash
maestro info claude
```

### Advanced Options

```bash
# Verbose logging
maestro --verbose

# Custom inactivity timeout (in milliseconds)
maestro --timeout 120000

# Disable loading spinners
maestro --no-spinner

# Combine options
maestro --plan-mode --verbose
```

## 🎯 Use Cases

### 1. Full-Stack Development

**Claude Code** intelligently delegates implementation to Codex and research to Gemini

```bash
$ maestro
> Build a secure authentication system with OAuth2
```

Claude analyzes the architecture, delegates code generation to Codex subagent, and may consult Gemini for OAuth2 best practices.

### 2. Planning and Research

**Use Plan Mode** when you want to research and plan before making changes

```bash
$ maestro --plan-mode
> Analyze the security vulnerabilities in our API
```

Claude will analyze and create a detailed plan without modifying any files.

### 3. Quick Tasks

**Single message mode** for quick questions or tasks

```bash
$ maestro -m "what does this error mean?"
```

### 4. Session Continuity

**Maintain context** across multiple interactions

```bash
$ maestro
> Create a todo API
> (Claude implements)
> Now add rate limiting
> (Claude continues with context from previous messages)
```

## 📖 Documentation

- [Skills Documentation](plugins/maestro-delegation-suite/skills/maestro-delegation-advisor/SKILL.md) - Delegation advisor skill details
- [Subagents Documentation](plugins/maestro-delegation-suite/agents/) - Codex and Gemini delegator configurations

## 🛠️ How It Works

AgentMaestro provides a streamlined orchestration layer:

1. **User starts Maestro** - Always uses Claude Code as primary agent
2. **Claude receives** user's request in a PTY (pseudo-terminal) session
3. **Session continuity** is maintained across multiple interactions
4. **Smart delegation** (when Codex/Gemini are installed):
   - Claude Code Skills help decide when to delegate
   - Claude spawns specialized **subagents** (`codex-delegator` or `gemini-delegator`)
   - Each subagent is a separate Claude instance that runs the actual CLI tool
   - Subagents execute in isolated 200k context windows (~20k token overhead)
   - AgentMaestro detects and displays delegation in real-time
5. **All output is formatted** and streamed back to the user with progress indicators

### Technical Details: Subagents vs Task Tool

AgentMaestro uses Claude Code's **Subagent** system:
- **Subagents** are persistent, configured Claude instances (`plugins/maestro-delegation-suite/agents/*.md`)
- Each has specialized knowledge (how to run `codex` or `gemini` CLI)
- **Task tool** is for ephemeral, ad-hoc parallel operations (file searches, etc.)
- **Both have ~20k token overhead** (new Claude instance + 200k context window)
- We use Subagents for their **specialized expertise**, not cost savings

## 🔧 Configuration

### Command Reference

| Command | Description |
|---------|-------------|
| `maestro` | Start interactive Claude Code session |
| `maestro init` | Initialize AgentMaestro with Claude Code integration |
| `maestro delegate <agent> <task>` | Delegate one-shot task to specific agent |
| `maestro list` | List all available agents |
| `maestro info <agent>` | Show agent information |
| `maestro skills install` | Install delegation advisor skill |
| `maestro skills uninstall` | Uninstall delegation advisor skill |
| `maestro skills status` | Check skill installation status |

### Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --message <text>` | Single message (non-interactive mode) | Interactive |
| `-v, --verbose` | Enable debug logging | `false` |
| `--plan-mode` | Enable plan mode (research without execution) | `false` |
| `--no-spinner` | Disable loading indicators | Enabled |
| `--timeout <ms>` | Inactivity timeout | `60000` (60s) |

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude Code
- [Google](https://ai.google.dev) for Gemini CLI
- [OpenAI](https://openai.com) for Codex
- [node-pty](https://github.com/microsoft/node-pty) for PTY management

## 📧 Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/AgentMaestro/issues)
- **Twitter**: [@yourusername](https://twitter.com/yourusername)

---

**Made with ❤️ for the AI developer community**
