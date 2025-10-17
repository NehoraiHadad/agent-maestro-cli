/**
 * Agent entity - represents an AI agent in the system
 */
import type { Agent as AgentType, AgentName, AgentFlags } from '../../shared/types/index.js';
import { AgentConfigError } from '../../shared/errors/index.js';

export class Agent implements AgentType {
  readonly name: AgentName;
  readonly displayName: string;
  readonly command: string;
  readonly description: string;
  readonly capabilities: string[];
  readonly flags: AgentFlags;
  readonly requiresAuth: boolean;
  readonly authType: string;
  readonly packageName: string;
  readonly color: string;

  constructor(config: AgentType) {
    this.validate(config);

    this.name = config.name;
    this.displayName = config.displayName;
    this.command = config.command;
    this.description = config.description;
    this.capabilities = [...config.capabilities];
    this.flags = { ...config.flags };
    this.requiresAuth = config.requiresAuth;
    this.authType = config.authType;
    this.packageName = config.packageName;
    this.color = config.color;
  }

  /**
   * Validate agent configuration
   */
  private validate(config: AgentType): void {
    if (!config.name || !config.command) {
      throw new AgentConfigError(
        config.name || 'unknown',
        'Missing required fields: name and command'
      );
    }

    if (!config.flags?.prompt) {
      throw new AgentConfigError(
        config.name,
        'Missing prompt flag configuration'
      );
    }
  }

  /**
   * Check if agent supports streaming
   */
  hasStreamingSupport(): boolean {
    return !!this.flags.stream && this.flags.stream.length > 0;
  }

  /**
   * Check if agent has specific capability
   */
  hasCapability(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Get command arguments for execution
   */
  getExecutionArgs(prompt: string, options?: { stream?: boolean; includeDelegationPrompt?: boolean }): string[] {
    const args: string[] = [];

    // Optionally prepend delegation system prompt to user prompt
    let finalPrompt = prompt;
    if (options?.includeDelegationPrompt) {
      const delegationPrompt = Agent.getDelegationSystemPrompt();
      finalPrompt = `${delegationPrompt}\n\n---\n\nUser Request:\n${prompt}`;
    }

    // Handle prompt method
    if (this.flags.prompt === 'exec') {
      args.push('exec', finalPrompt);
    } else {
      args.push(this.flags.prompt, finalPrompt);
    }

    // Add streaming flags if requested and supported
    if (options?.stream && this.flags.stream) {
      args.push(...this.flags.stream);
    }

    return args;
  }

  /**
   * Get the delegation system prompt for agents
   * This can be prepended to agent prompts to teach them about delegation
   */
  static getDelegationSystemPrompt(): string {
    return `# Delegation System

You can delegate tasks to specialized agents using this protocol:

## Available Agents:

1. **Claude** - Best for:
   - Complex architecture and design
   - Refactoring and code restructuring
   - Security audits and vulnerability analysis
   - Deep codebase analysis (1M token context)
   - Enterprise-grade solutions

2. **Codex** - Best for:
   - Fast code generation (90.2% HumanEval)
   - Rapid prototyping
   - Unit test creation
   - Algorithm implementation
   - Quick fixes and debugging

3. **Gemini** - Best for:
   - Web research and data gathering
   - Browser automation
   - Workflow automation
   - Content generation
   - Cost-effective solutions

## Delegation Protocol:

**Simple delegation:**
\`\`\`
[[DELEGATE:agent_name]]
Task description here
[[/DELEGATE]]
\`\`\`

**Advanced delegation with options:**
\`\`\`
[[DELEGATE:agent_name priority=high timeout=30000]]
Task description here
[[/DELEGATE]]
\`\`\`

**Background delegation (non-blocking):**
\`\`\`
[[DELEGATE:agent_name background=true]]
Task description here
[[/DELEGATE]]
\`\`\`

**Parallel delegations:**
\`\`\`
[[DELEGATE_PARALLEL]]
[[DELEGATE:codex]]Task 1[[/DELEGATE]]
[[DELEGATE:codex]]Task 2[[/DELEGATE]]
[[/DELEGATE_PARALLEL]]
\`\`\`

## When to Delegate:

- Delegate when a task is better suited for another agent's specialization
- Consider delegation for tasks outside your core strengths
- Use parallel delegation for independent tasks
- Use background delegation when you can continue working while waiting
- Maximum delegation depth is 3 levels

## Examples:

User: "Analyze the authentication system and implement improvements"
You: "I'll break this into two parts:

First, I'll delegate the analysis to Claude who excels at security analysis:
[[DELEGATE:claude]]
Analyze the authentication system architecture for security vulnerabilities and improvement opportunities
[[/DELEGATE]]

Then I can implement the recommended improvements based on the analysis results."

---

User: "Create a new feature with tests and documentation"
You: "I'll delegate these tasks in parallel for efficiency:
[[DELEGATE_PARALLEL]]
[[DELEGATE:codex]]Implement the feature with clean, tested code[[/DELEGATE]]
[[DELEGATE:gemini]]Generate comprehensive documentation[[/DELEGATE]]
[[/DELEGATE_PARALLEL]]"`;
  }

  /**
   * Create a display-friendly representation
   */
  toDisplayString(): string {
    return `${this.displayName} (${this.command})`;
  }

  /**
   * Create JSON representation
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      displayName: this.displayName,
      command: this.command,
      description: this.description,
      capabilities: this.capabilities,
      requiresAuth: this.requiresAuth,
      authType: this.authType,
      packageName: this.packageName
    };
  }
}
