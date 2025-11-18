/**
 * MaestroError - General error for AgentMaestro operations
 * Covers configuration, orchestration, and general failures
 */

export class MaestroError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'MAESTRO_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MaestroError';
    this.code = code;
    this.context = context;

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
    return details;
  }
}
