/**
 * Base error class for all Maestro errors
 * Provides consistent error structure and metadata
 */
export abstract class BaseError extends Error {
  public readonly timestamp: Date;
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Returns a formatted error message with context
   */
  public toFormattedString(): string {
    const contextStr = this.context
      ? `\nContext: ${JSON.stringify(this.context, null, 2)}`
      : '';
    return `[${this.code}] ${this.message}${contextStr}`;
  }

  /**
   * Returns JSON representation of the error
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}
