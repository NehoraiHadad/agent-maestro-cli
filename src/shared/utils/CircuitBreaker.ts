/**
 * CircuitBreaker.ts
 * Implements circuit breaker pattern for fault tolerance
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly state: CircuitState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;

  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout ?? 60000,
      onStateChange: options.onStateChange ?? (() => {})
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN. Next attempt at ${this.nextAttemptTime?.toISOString()}`,
          this.state
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
    nextAttemptTime?: Date;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.transitionTo('CLOSED');
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.transitionTo('CLOSED');
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.successCount = 0;

    if (
      this.state === 'HALF_OPEN' ||
      this.failureCount >= this.options.failureThreshold
    ) {
      this.transitionTo('OPEN');
      this.nextAttemptTime = new Date(Date.now() + this.options.timeout);
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.nextAttemptTime !== undefined &&
      new Date() >= this.nextAttemptTime
    );
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.options.onStateChange(oldState, newState);
  }
}
