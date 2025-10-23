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
   * - Codex: Uses `resume --last` or `resume <sessionId>`
   * - Gemini: Handles sessions automatically via `--prompt-interactive`
   */
  getExecutionArgs(
    prompt: string,
    options?: {
      stream?: boolean;
      continueSession?: boolean;
      sessionId?: string;
      planMode?: boolean;
    }
  ): string[] {
    const args: string[] = [];

    // Ensure Codex always runs with full-access flag so it won't block on prompts
    if (this.name === 'codex') {
      args.push('--dangerously-bypass-approvals-and-sandbox');
    }
    const finalPrompt = prompt;

    // Handle Codex continuation specially (it's a different command structure)
    if (this.name === 'codex' && options?.continueSession) {
      // Codex resume: codex resume [--last | <sessionId>] [--stream flags] <prompt>
      args.push('resume');

      if (options.sessionId) {
        args.push(options.sessionId);
      } else {
        args.push('--last');
      }

      // Add streaming flags BEFORE prompt for codex resume
      if (options?.stream && this.flags.stream) {
        args.push(...this.flags.stream);
      }

      // Add prompt last
      args.push(finalPrompt);

      return args;
    }

    // Handle Claude continuation
    if (this.name === 'claude' && options?.continueSession) {
      // Claude: --continue (last session) or --resume <sessionId>
      if (options.sessionId) {
        args.push('--resume', options.sessionId);
      } else {
        args.push('--continue');
      }
    }

    // Handle Claude Plan Mode
    if (this.name === 'claude' && options?.planMode) {
      args.push('--permission-mode', 'plan');
    }
    // Gemini handles sessions automatically via --prompt-interactive

    // Handle prompt method (standard execution)
    if (this.flags.prompt === 'exec') {
      args.push('exec', finalPrompt);
    } else {
      args.push(this.flags.prompt, finalPrompt);
    }

    // Add streaming flags if requested and supported (after prompt)
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
