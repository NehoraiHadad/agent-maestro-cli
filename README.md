# 🎭 AgentMaestro

**Meta-orchestrator for collaborative AI coding agents**

AgentMaestro enables seamless collaboration between Claude Code, Gemini CLI, and OpenAI Codex. Choose a primary agent, and it can intelligently delegate tasks to secondary agents - creating a powerful multi-agent development workflow.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

## ✨ Features

- 🎯 **Intelligent Orchestration** - Primary agent coordinates with secondary agents
- 🔄 **Seamless Delegation** - Simple protocol for inter-agent communication
- 🚀 **Zero Configuration** - Works with existing CLI tools out-of-the-box
- 💬 **Interactive Mode** - User-friendly agent selection menu
- 🔧 **Flexible** - Support for parallel delegation and depth control
- 📊 **Rich Logging** - Beautiful terminal output with progress indicators

## 🎬 Quick Demo

```bash
$ maestro --agent claude

🎭 Agent Maestro
═══════════════════════════════════════
ℹ Primary agent: Claude Code
ℹ Available for delegation: gemini, codex

> Build a Flask todo app with security best practices

[Claude plans architecture...]
🎭 [Maestro] Delegating to codex
  ✓ Codex completed task (2.8s)

[Claude reviews code...]
🎭 [Maestro] Delegating to gemini
  ✓ Gemini CLI completed task (4.1s)

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

# Custom timeout (in milliseconds)
maestro --agent gemini --timeout 120000

# Set maximum delegation depth
maestro --agent codex --max-depth 5
```

## 🎯 Use Cases

### 1. Full-Stack Development

**Primary: Claude** (for architecture) → **Codex** (for code) → **Gemini** (for research)

```bash
$ maestro --agent claude
> Build a secure authentication system with OAuth2
```

### 2. Debugging Complex Issues

**Primary: Gemini** (for research) → **Codex** (for implementation)

```bash
$ maestro --agent gemini
> Research WebSocket connection errors and implement fix
```

### 3. Code Review & Testing

**Primary: Claude** (for review) → **Codex** (for tests) → **Gemini** (for vulnerabilities)

```bash
$ maestro --agent claude
> Review auth.js, generate tests, check for security issues
```

## 📖 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [Usage Guide](docs/USAGE.md) - Detailed usage instructions
- [Delegation Protocol](docs/PROTOCOL.md) - Inter-agent communication spec

## 🛠️ How It Works

1. **User starts Maestro** with a primary agent
2. **Primary agent receives** user's request
3. **Agent decides** if it needs help from secondary agents
4. **Emits delegation request** using the protocol:
   ```
   MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "search Flask docs"}
   ```
5. **Maestro intercepts**, spawns secondary agent, and returns result
6. **Primary agent** incorporates result and continues

## 🔧 Configuration

### Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `-a, --agent <name>` | Primary agent name | Interactive menu |
| `-v, --verbose` | Enable debug logging | `false` |
| `--no-spinner` | Disable loading indicators | Enabled |
| `--timeout <ms>` | Delegation timeout | `60000` |
| `--max-depth <n>` | Max delegation depth | `3` |

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
