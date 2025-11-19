/**
 * Agent entity - represents an AI agent in the system
 */
import type { Agent as AgentType, AgentName, AgentFlags, AgentExecutionOptions } from '../../shared/types/index.js';
import { MaestroError } from '../../shared/errors/index.js';

export class Agent implements AgentType {
  readonly name: AgentName;
  readonly displayName: string;
  readonly command: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly flags: Readonly<AgentFlags>;
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
      throw new MaestroError(
        'Missing required fields: name and command',
        'AGENT_CONFIG_ERROR',
        { agentName: config.name || 'unknown' }
      );
    }

    if (!config.flags?.prompt) {
      throw new MaestroError(
        'Missing prompt flag configuration',
        'AGENT_CONFIG_ERROR',
        { agentName: config.name }
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
   *
   * Note: AgentMaestro only supports Claude Code directly.
   * This method is simplified for Claude-only execution.
   *
   * @param prompt - The user's message/prompt
   * @param options - Execution options
   * @param options.stream - Enable streaming output (default: false)
   * @param options.continueSession - Continue previous session (ONLY in interactive mode)
   * @param options.sessionId - Specific session ID to resume (optional)
   * @param options.planMode - Enable plan mode (research without execution)
   *
   * @returns Command arguments array ready for execution
   *
   * @remarks
   * The `continueSession` flag should ONLY be true in interactive mode.
   * In non-interactive mode (using -m flag), each call should be independent.
   *
   * Session continuation behavior:
   * - Claude: Uses `--continue` (last session) or `--resume <sessionId>`
   */
  getExecutionArgs(
    prompt: string,
    options?: AgentExecutionOptions
  ): string[] {
    const args: string[] = [];

    // Handle Claude session continuation
    if (options?.continueSession) {
      if (options.sessionId) {
        args.push('--resume', options.sessionId);
      } else {
        args.push('--continue');
      }
    }

    // Handle Claude Plan Mode
    if (options?.planMode) {
      args.push('--permission-mode', 'plan');
    }

    // Add prompt
    args.push(this.flags.prompt, prompt);

    // Add streaming flags if requested and supported
    if (options?.stream && this.flags.stream) {
      args.push(...this.flags.stream);
    }

    return args;
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
