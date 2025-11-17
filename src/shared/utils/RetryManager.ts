/**
 * RetryManager.ts
 * Provides retry logic with exponential backoff
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay?: number;
  exponential?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Retry manager with exponential backoff support
 */
export class RetryManager {
  private defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    exponential: true,
    onRetry: () => {}
  };

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === opts.maxRetries) {
          throw new RetryError(
            `Failed after ${opts.maxRetries} attempts`,
            attempt,
            lastError
          );
        }

        opts.onRetry(attempt, lastError);

        const delay = this.calculateDelay(attempt, opts);
        await this.delay(delay);
      }
    }

    throw new RetryError(
      `Failed after ${opts.maxRetries} attempts`,
      opts.maxRetries,
      lastError
    );
  }

  /**
   * Calculate delay for retry attempt
   */
  private calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    const delay = options.exponential
      ? options.baseDelay * Math.pow(2, attempt - 1)
      : options.baseDelay * attempt;

    return Math.min(delay, options.maxDelay);
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
