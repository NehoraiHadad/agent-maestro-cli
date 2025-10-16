# 🎭 Agent Maestro

CLI wrapper for collaborative AI coding agents (Claude, Gemini, Codex).

## Overview

Agent Maestro enables multiple AI agents to work together. Select a primary agent, and it can delegate tasks to other agents seamlessly.

## Installation

```bash
npm install
npm link
```

## Usage

### Start with primary agent:

```bash
maestro --agent gemini
maestro --agent claude
maestro --agent codex
```

### Without arguments - see agent menu:

```bash
maestro
```

## Delegation Protocol

The primary agent can delegate tasks using:

```
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Analyze this code for bugs"}
```

Example user prompt to primary agent:

> "You are running as primary agent in Maestro. To delegate, output: `MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "your task"}`. Now, refactor this code using codex agent."

## Features

- **Seamless PTY integration** - Full terminal emulation with colors and interactive features
- **Smart delegation** - Primary agent can request help from secondary agents
- **Clean UX** - Color-coded logs and clear status messages
- **Configurable** - Timeout and depth limits for delegations

## Architecture

- `src/index.js` - CLI entry point
- `src/core/maestro.js` - Main orchestrator
- `src/core/delegator.js` - Delegation handler
- `src/config.js` - Agent configurations
- `src/utils/logger.js` - Logging utilities

