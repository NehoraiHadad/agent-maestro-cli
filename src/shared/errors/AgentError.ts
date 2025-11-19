/**
 * AgentError - Errors related to agent operations
 * Covers spawn failures, execution errors, and process issues
 */

export class AgentError extends Error {
  public readonly agentName: string;
  public readonly code: string;
  public readonly exitCode?: number;
  public readonly context?: Record<string, unknown>;
  public readonly isRetryable: boolean;
  public readonly timestamp: Date;

  constructor(
    agentName: string,
    message: string,
    code: string = 'AGENT_ERROR',
    exitCode?: number,
    context?: Record<string, unknown>,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AgentError';
    this.agentName = agentName;
    this.code = code;
    this.exitCode = exitCode;
    this.context = context;
    this.isRetryable = isRetryable;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AgentError);
    }
  }

  /**
   * Get formatted error details for logging
   */
  getDetails(): string {
    let details = `[${this.code}] Agent: ${this.agentName} - ${this.message}`;
    if (this.exitCode !== undefined) {
      details += `\nExit Code: ${this.exitCode}`;
    }
    if (this.context) {
      details += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }
    if (this.isRetryable) {
      details += '\nRetryable: Yes';
    }
    return details;
  }

  /**
   * Returns JSON representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      agentName: this.agentName,
      code: this.code,
      message: this.message,
      exitCode: this.exitCode,
      context: this.context,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}
