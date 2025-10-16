# Agent Maestro - Usage Guide

## Prerequisites

Install the CLI agents you want to use:

```bash
# Install agents globally
npm install -g @anthropic-ai/claude-code
npm install -g @google/gemini-cli
npm install -g @openai/codex
```

## Quick Start

### 1. Install Maestro dependencies

```bash
cd /home/ubuntu/projects/AgentMaestro
npm install
```

### 2. Run Agent Maestro

```bash
# See available agents
node src/index.js

# Start with specific agent
node src/index.js --agent gemini
node src/index.js --agent claude
node src/index.js --agent codex
```

### 3. Optional: Link globally

```bash
npm link
maestro --agent gemini
```

## Testing Agents

Check if agents are installed:

```bash
./test/test-all-agents.sh
```

## How to Use Delegation

When working with your primary agent, you can ask it to delegate tasks:

### Example Prompts:

**To the primary agent:**

> You are running as a primary agent in Agent Maestro. When you need help from another agent, output a delegation command in this format: `MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "your task here"}`.
>
> Available agents: claude, gemini, codex
>
> Now, please analyze this code and use the gemini agent to check for security issues.

### Delegation Format:

```
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Analyze code for security vulnerabilities"}
```

## UX Features

- **Color-coded logs**: Easy to distinguish Maestro messages from agent output
- **Agent selection menu**: Simple CLI interface for choosing primary agent
- **Clean delegation**: Secondary agent results are clearly marked
- **Graceful exit**: Ctrl+C properly terminates all processes

## Configuration

Edit `src/config.js` to customize:

- `delegationTimeout`: Max wait time for secondary agents (default: 30s)
- `maxDelegationDepth`: Prevent infinite delegation loops (default: 3)

## Troubleshooting

### "Command not found" errors

Make sure the CLI tools are installed:

```bash
npm install -g @anthropic-ai/claude-code
npm install -g @google/gemini-cli
npm install -g @openai/codex
```

### PTY errors

node-pty requires native compilation. If it fails:

```bash
npm rebuild node-pty
```

