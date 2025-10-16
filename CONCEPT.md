# Agent Maestro - Concept and Implementation Plan

## 1. Introduction

The goal of this project is to create a wrapper tool called "Agent Maestro" that facilitates collaboration between three different AI-powered command-line interface (CLI) tools: Claude Code CLI, Gemini CLI, and Codex CLI. The user will be able to select a primary agent, and the Maestro tool will manage the interaction between the agents, allowing them to work together to accomplish tasks.

This document outlines the research findings, proposed architecture, and implementation plan for the Agent Maestro tool.

**Assumption:** The three CLI tools (Claude Code CLI, Gemini CLI, and Codex CLI) are already installed globally on the user's system.

## 2. Research & Existing Code Analysis

An analysis of the existing codebase (`/agent-maestro/`) reveals a solid, modular starting point with a clear separation of concerns (`index.js`, `maestro.js`, `adapters/`, `agents/`). The project correctly identifies the need for a central orchestrator and adapters for each agent.

The key finding is the inclusion of the `node-pty` dependency in `package.json`. This library is superior to the standard `child_process.spawn` (currently used in `maestro.js`) for this use case. `node-pty` allows spawning processes within a pseudo-terminal (PTY), which correctly simulates a user's interactive terminal session. This is critical for handling the complex, real-time, and interactive nature of the underlying CLI tools, including features like color codes, progress bars, and interactive prompts that don't use standard line-buffering.

The current implementation is a skeleton that successfully launches a primary agent and pipes I/O, but the inter-agent collaboration logic is not yet functional.

## 3. Proposed Architecture

To build a robust and truly collaborative system, we will refine the existing architecture with the following concepts:

### 3.1. Core Technology: `node-pty`
The `Maestro` class will be refactored to use `node-pty` instead of `child_process`. This will be the foundation for all agent interactions, providing stable, high-fidelity communication with the underlying CLIs.

### 3.2. The Maestro (`maestro.js`)
The Maestro remains the central orchestrator. Its primary responsibilities will be:
1.  **Process Management:** Spawn and manage the lifecycle of the primary agent's PTY process. It will also spawn and manage *temporary* PTY processes for secondary agents on demand.
2.  **I/O Routing:** Route the user's `stdin` to the primary agent's process.
3.  **Output Interception & Analysis:** Intercept all `stdout` from the primary agent and analyze it in real-time to identify "Delegation Requests".
4.  **Delegation Execution:** Manage the entire lifecycle of a delegation request: spawn a secondary agent, pass the prompt, capture the result, and feed it back to the primary agent.

### 3.3. Delegation Protocol
To enable true collaboration, we need a formal protocol for a primary agent to request assistance from a secondary one. The primary agent will be prompted to emit a specially formatted string to its `stdout`. The Maestro will intercept this string, preventing it from being displayed to the user and triggering the delegation flow.

**Proposed Format:** A single-line JSON object prefixed with a unique identifier.

```
MAESTRO_DELEGATE::{"agent": "<agent_name>", "prompt": "<prompt_for_secondary_agent>"}
```

*   **Example:** `MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Read the file 'main.py' and identify potential bugs."}`

This structured format is unambiguous and easily parsable.

### 3.4. Adapters (`adapters/*.js`)
The role of the adapters is to translate agent-specific output into standardized events for the Maestro, although for the delegation protocol, this is less critical. Their main role could be to format prompts *for* an agent if it has specific requirements. For now, the main logic will reside in the Maestro.

## 4. Detailed Implementation Plan

### Step 1: Refactor to `node-pty`
- **File:** `maestro.js`
- **Action:** Replace `import { spawn } from 'child_process';` with `import * as pty from 'node-pty';`.
- **Action:** Change the `start()` method to use `pty.spawn()`. The API is very similar.
- **Action:** Wire up the `ptyProcess.onData` event for output and `ptyProcess.write` for input. This will replace the current `stdout.on('data')` and `stdin.pipe()`.

### Step 2: Implement the Delegation Flow in Maestro
- **File:** `maestro.js`
- **Action:** In the `handleOutput` (or `onData`) method, add logic to scan the incoming data for the `MAESTRO_DELEGATE::` prefix.
- **Action:** If a match is found:
    1.  Prevent the matched line from being printed to the user's console.
    2.  Parse the JSON payload to get the target `agent` and `prompt`.
    3.  Log a message to the user, e.g., `[Maestro] Primary agent is requesting help from ${agent}. Executing...`
    4.  Call a new method, e.g., `executeDelegation(agent, prompt)`.

### Step 3: Create the `executeDelegation` Method
- **File:** `maestro.js`
- **Action:** This new asynchronous method will:
    1.  Find the correct command for the secondary agent from the `agents` configuration.
    2.  Spawn a *new, temporary* `pty.spawn()` process for the secondary agent.
    3.  Write the `prompt` to the secondary agent's `stdin`, ensuring a newline character `\n` is included to submit the command.
    4.  Create a variable (e.g., `let result = '';`) and append all data from the secondary agent's `onData` event to it.
    5.  Listen for the secondary agent's `onExit` event. This signals that the task is complete.
    6.  Once the process exits, take the captured `result` and write it back to the *primary* agent's PTY process (`this.childProcess.write(...)`). It's good practice to frame the result, e.g., `Here is the result from the ${agent} agent:\n${result}\n`.

### Step 4: User Interaction & Prompting
The final piece is enabling the agents to use this protocol. The user, interacting with the primary agent, will need to be instructed to ask it to delegate.

*   **User Prompt Example:** "You are running as a primary agent in Maestro. To use another agent for a task, output a command in the format: `MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "<your task>"}`. Now, please refactor the following code using the 'codex' agent."

This "meta-prompting" makes the agent aware of its collaborative capabilities.

## 5. Conclusion

This refined plan provides a clear path forward. By leveraging `node-pty` for robust terminal emulation and defining a clear `Delegation Protocol`, we can build a powerful Agent Maestro tool that fulfills the vision of collaborative, multi-agent CLI workflows. The existing codebase is a great foundation for these next steps.