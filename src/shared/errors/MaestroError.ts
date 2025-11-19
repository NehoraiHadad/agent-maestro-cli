/**
 * MaestroError - General error for AgentMaestro operations
 * Covers configuration, orchestration, and general failures
 */

export class MaestroError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly isRetryable: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'MAESTRO_ERROR',
    context?: Record<string, unknown>,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'MaestroError';
    this.code = code;
    this.context = context;
    this.isRetryable = isRetryable;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MaestroError);
    }
  }

  /**
   * Get formatted error details for logging
   */
  getDetails(): string {
    let details = `[${this.code}] ${this.message}`;
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
      code: this.code,
      message: this.message,
      context: this.context,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}
