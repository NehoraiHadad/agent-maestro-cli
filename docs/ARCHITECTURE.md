# AgentMaestro Architecture

## Strategic Decision: Pure Wrapper Architecture

**Decision Date:** 2025-11-19
**Status:** ✅ Implemented
**Task:** TASK-002

### Chosen Strategy: Pure Wrapper for Claude Code

AgentMaestro is a **pure wrapper** for Claude Code. It does NOT provide direct access to Codex or Gemini. Instead, all agent delegation is handled through Claude Code's native Subagent system.

#### Why Pure Wrapper?

1. **Simplicity** - Less code to maintain, fewer potential bugs
2. **Leverage Native Features** - Claude Code already has robust Subagent delegation
3. **Clear Value Proposition** - We add value through wrapper features (Plan Mode, session management, live delegation detection), not by reimplementing agent access
4. **Alignment** - Matches our README messaging and project identity
5. **Maintainability** - Only track one CLI's API changes

#### How to Use Codex/Gemini

Users access Codex and Gemini through Claude Code's Subagent system:

1. **Install the delegation agents** (optional but recommended):
   ```bash
   claude plugin install maestro-delegation-suite
   ```

2. **Ask Claude to delegate** naturally:
   ```bash
   $ maestro
   > Build a Flask API with security best practices

   # Claude analyzes and may delegate:
   # - Code generation → codex-delegator Subagent (runs actual Codex CLI)
   # - Research → gemini-delegator Subagent (runs actual Gemini CLI)
   ```

3. **Claude decides when to delegate** based on task requirements and the delegation advisor skill

#### What AgentMaestro Provides

- ✅ Enhanced Claude Code wrapper with Plan Mode support
- ✅ Session continuity and management
- ✅ Real-time delegation detection and display
- ✅ Rich logging and progress indicators
- ✅ Plugin integration for Skills and Subagents
- ❌ NOT direct Codex/Gemini CLI access (use Claude's Subagents instead)

#### Rejected Alternative: Hybrid System

We considered a hybrid approach with direct access to all three agents, but rejected it because:
- Higher complexity and maintenance burden
- Duplicates Claude Code's existing Subagent functionality
- Contradicts "wrapper" positioning
- Would require maintaining integrations for 3 separate CLIs

---

## Overview

AgentMaestro is a specialized wrapper for Claude Code that enhances it with additional features while leveraging Claude Code's native Subagent system for multi-agent workflows.

## System Architecture

```
┌─────────────────────────────────────────────┐
│              User Terminal                  │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────┐
│           Maestro Core                        │
│  ┌─────────────────────────────────────────┐ │
│  │    Input/Output Router                  │ │
│  │  - Routes user input to primary agent   │ │
│  │  - Intercepts delegation requests       │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │    Delegation Manager                   │ │
│  │  - Parses delegation protocol           │ │
│  │  - Spawns secondary agent processes     │ │
│  │  - Aggregates results                   │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │    PTY Manager                          │ │
│  │  - Manages pseudo-terminal processes    │ │
│  │  - Handles I/O streams                  │ │
│  │  - Process lifecycle management         │ │
│  └─────────────────────────────────────────┘ │
└───────────────┬───────────────────────────────┘
                │
        ┌───────┴────────┐
        │                │
    ┌───▼────┐      ┌────▼─────┐
    │Primary │      │Secondary │
    │Agent   │─────►│Agents    │
    │(PTY)   │      │Pool      │
    └────────┘      │(PTY x N) │
                    └──────────┘
```

## Core Components

### 1. Maestro Core (`src/core/maestro.js`)

The central orchestrator responsible for:
- Managing the primary agent's PTY process
- Routing user input to the primary agent
- Intercepting and parsing delegation requests
- Coordinating with the Delegation Handler

**Key Methods:**
- `start()` - Initialize and start orchestration
- `handleOutput(data)` - Process output from primary agent
- `processDelegation(line)` - Execute delegation requests

### 2. Delegation Handler (`src/core/delegation-handler.js`)

Manages delegation to secondary agents:
- Spawns temporary PTY processes for secondary agents
- Executes tasks with timeout protection
- Supports parallel delegation
- Prevents infinite delegation loops

**Key Methods:**
- `execute(agentName, prompt, options)` - Execute single delegation
- `executeParallel(delegations)` - Execute multiple delegations concurrently
- `runDelegation(id, agent, prompt, timeout)` - Low-level delegation runner

### 3. PTY Manager (`src/core/pty-manager.js`)

Low-level pseudo-terminal management:
- Spawns and manages PTY processes
- Event handling (data, exit)
- Process lifecycle (spawn, kill, cleanup)
- Buffer management

**Key Methods:**
- `spawn(id, command, args, options)` - Create new PTY process
- `write(id, data)` - Write to process stdin
- `onData(id, handler)` - Register data handler
- `kill(id, signal)` - Terminate process

### 4. CLI Interface (`src/cli/`, `src/index.js`)

Command-line interface components:
- Interactive agent selection menu
- Command parsing (Commander.js)
- User-friendly output formatting

## Delegation Protocol

### Format

```
MAESTRO_DELEGATE::{"agent": "<name>", "prompt": "<task>", "priority": "<level>"}
```

### Example

```javascript
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Search for Flask best practices", "priority": "high"}
```

### Protocol Flow

1. **Detection**: Maestro Core scans output for `MAESTRO_DELEGATE::` prefix
2. **Parsing**: Extract and validate JSON payload
3. **Execution**: Delegation Handler spawns secondary agent
4. **Result**: Format and return result to primary agent

### Response Format

```
[MAESTRO_RESULT]
Agent: Gemini CLI
============================================================
<result content>
============================================================
```

## Agent Configuration

### Structure (`src/agents/agent-config.js`)

Each agent has:
- `name`: Internal identifier
- `displayName`: Human-readable name
- `command`: CLI command
- `description`: Agent capabilities
- `flags`: Command-line flags
- `capabilities`: List of strengths

### Agent Capabilities (`src/agents/agent-capabilities.js`)

Defines:
- Best use cases for each agent
- Performance ratings (1-10)
- Context window sizes
- Feature support (MCP, binary files, etc.)

## Data Flow

### Normal Operation

```
User Input → Primary Agent PTY → Output → User Terminal
```

### With Delegation

```
User Input → Primary Agent PTY → Delegation Request
                                         ↓
                              Maestro Core (parse)
                                         ↓
                              Delegation Handler
                                         ↓
                              Secondary Agent PTY
                                         ↓
                              Result Aggregation
                                         ↓
                              Primary Agent PTY → User Terminal
```

## Security Considerations

1. **Process Isolation**: Each agent runs in separate PTY
2. **Timeout Protection**: All delegations have timeout limits
3. **Depth Limiting**: Maximum delegation depth prevents recursion
4. **Input Sanitization**: JSON parsing with error handling
5. **No Elevated Privileges**: Runs with user permissions

## Error Handling

### Error Types

- `MaestroError`: Base error class
- `AgentNotFoundError`: Agent doesn't exist
- `AgentNotAvailableError`: Agent not installed
- `DelegationError`: Delegation failed
- `DelegationTimeoutError`: Delegation exceeded timeout
- `MaxDelegationDepthError`: Depth limit reached
- `PTYError`: PTY process error

### Error Flow

```
Error Occurs → Catch in Handler → Log Error → Format Error Message → Return to Primary Agent
```

## Performance Considerations

1. **PTY Overhead**: Each PTY process has ~5-10ms spawn overhead
2. **Parallel Delegation**: Multiple agents can run simultaneously
3. **Buffer Management**: Output buffering prevents data loss
4. **Cleanup**: Automatic cleanup of finished processes

## Future Enhancements

### Phase 1 (Current MVP)
- [x] Basic orchestration
- [x] Simple delegation protocol
- [x] Single secondary agent support

### Phase 2 (Planned)
- [ ] Parallel delegation
- [ ] Enhanced logging
- [ ] Retry mechanisms
- [ ] Better error recovery

### Phase 3 (Future)
- [ ] MCP integration
- [ ] Plugin system
- [ ] Configuration profiles
- [ ] A2A protocol support

## Technology Stack

- **Runtime**: Node.js 18+
- **PTY Management**: node-pty
- **CLI Framework**: Commander.js
- **Interactive Prompts**: Inquirer.js
- **Terminal Styling**: Chalk
- **Loading Indicators**: Ora

## File Structure

```
src/
├── core/              # Core orchestration logic
│   ├── maestro.js         # Main orchestrator
│   ├── delegation-handler.js  # Delegation execution
│   ├── pty-manager.js     # PTY process management
│   └── errors.js          # Error definitions
├── agents/            # Agent configurations
│   ├── agent-config.js    # Agent definitions
│   └── agent-capabilities.js  # Capability ratings
├── protocols/         # Communication protocols
│   └── delegation-protocol.js  # Delegation format
├── utils/             # Utilities
│   ├── logger.js          # Logging
│   └── smart-spinner.js   # Loading indicators
└── cli/               # CLI interface
    └── interactive-menu.js  # Agent selection
```
