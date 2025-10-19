# 🎭 AgentMaestro

**Streamlined orchestrator for AI coding agents with Claude Code Skills integration**

AgentMaestro provides a unified interface for Claude Code, Gemini CLI, and OpenAI Codex. When using Claude Code as your primary agent, AgentMaestro enhances it with intelligent delegation capabilities through Claude Code's Skills and Subagents system.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

## ✨ Features

- 🎯 **Unified Interface** - Single CLI for Claude Code, Gemini CLI, and Codex
- 🔄 **Claude Code Skills Integration** - Enhanced delegation through native Skills system
- 🚀 **Zero Configuration** - Works with existing CLI tools out-of-the-box
- 💬 **Interactive Mode** - User-friendly agent selection menu
- 🔧 **Session Continuity** - Maintains conversation context across interactions
- 📊 **Rich Logging** - Beautiful terminal output with progress indicators
- 🔍 **Live Detection** - Real-time monitoring when Claude Code uses subagents

## 🎬 Quick Demo

```bash
$ maestro --agent claude

🎭 Starting AgentMaestro with claude
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

## 📦 Installation

### Prerequisites

- Node.js 18+
- At least one AI CLI tool installed:
  - [Claude Code](https://claude.ai/code)
  - [Gemini CLI](https://ai.google.dev/gemini-api/docs/cli)
  - [OpenAI Codex](https://openai.com/codex)

### Install AgentMaestro

```bash
# Clone the repository
git clone https://github.com/yourusername/AgentMaestro.git
cd AgentMaestro

# Install dependencies
npm install

# Link globally
npm link

# Verify installation
maestro --version
```

### Install AI Agents

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Install Gemini CLI
npm install -g @google/gemini-cli

# Install Codex
npm install -g @openai/codex
```

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

The skill will be installed to `~/.claude/skills/maestro-delegation-advisor/` and automatically loaded by Claude Code.

### How it Works

The skill integrates with Claude Code's native Task tool system:

1. **User requests a task** through AgentMaestro
2. **Claude Code analyzes** using the delegation advisor skill
3. **Skill recommends** the best agent (Codex or Gemini) based on task type
4. **Claude uses Task tool** to delegate to the appropriate subagent
5. **AgentMaestro detects** and displays delegation in real-time
6. **Subagent completes task** in isolated context (no token contamination)
7. **Claude incorporates result** into final response

### When to Use

**Always recommended when:**
- Using Claude as primary agent
- Tasks require intelligent delegation
- You want optimal multi-agent collaboration

**Not needed if:**
- Only using a single agent
- Manual delegation is preferred
- Codex or Gemini are primary (they don't support Skills yet)

For more details, see: [.claude/skills/maestro-delegation-advisor/SKILL.md](.claude/skills/maestro-delegation-advisor/SKILL.md)

## 🚀 Usage

### Basic Usage

```bash
# Interactive mode (recommended)
maestro

# Specify primary agent directly
maestro --agent claude
maestro --agent gemini
maestro --agent codex
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
maestro --agent claude --verbose

# Custom inactivity timeout (in milliseconds)
maestro --agent gemini --timeout 120000

# Disable loading spinners
maestro --agent claude --no-spinner
```

## 🎯 Use Cases

### 1. Full-Stack Development with Claude Code

**Claude Code** intelligently delegates implementation to Codex and research to Gemini

```bash
$ maestro --agent claude
> Build a secure authentication system with OAuth2
```

Claude analyzes the architecture, delegates code generation to Codex subagent, and may consult Gemini for OAuth2 best practices.

### 2. Direct Agent Usage

**Use Gemini or Codex directly** when you know which agent you need

```bash
$ maestro --agent gemini
> Research WebSocket connection errors in Node.js

$ maestro --agent codex
> Generate unit tests for auth.js
```

### 3. Session Continuity

**Maintain context** across multiple interactions (Claude and Codex only)

```bash
$ maestro --agent claude
> Create a todo API
> (Claude implements)
> Now add rate limiting
> (Claude continues with context from previous messages)
```

## 📖 Documentation

- [Skills Documentation](.claude/skills/maestro-delegation-advisor/SKILL.md) - Delegation advisor skill details
- [Subagents Documentation](.claude/agents/) - Codex and Gemini delegator configurations

## 🛠️ How It Works

AgentMaestro provides a streamlined orchestration layer:

1. **User starts Maestro** with their chosen agent
2. **Agent receives** user's request in a PTY (pseudo-terminal) session
3. **Session continuity** is maintained across multiple interactions (Claude/Codex)
4. **When using Claude Code:**
   - Claude Code Skills help decide when to delegate
   - Claude uses its native Task tool to call Codex/Gemini subagents
   - Subagents run in isolated contexts (token-efficient)
   - AgentMaestro detects and displays delegation in real-time
5. **All output is formatted** and streamed back to the user with progress indicators

## 🔧 Configuration

### Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `-a, --agent <name>` | Primary agent (claude, gemini, codex) | Interactive menu |
| `-m, --message <text>` | Single message (non-interactive mode) | Interactive |
| `-v, --verbose` | Enable debug logging | `false` |
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
