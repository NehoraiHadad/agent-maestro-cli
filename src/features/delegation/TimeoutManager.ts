/**
 * Timeout Manager - manages inactivity timeout for delegations
 */

/**
 * Manages inactivity-based timeout detection for delegation operations.
 * Automatically resets on activity and triggers callback on timeout.
 */
export class TimeoutManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private timeoutMs: number;
  private onTimeout: () => void;

  /**
   * Create a new TimeoutManager
   * @param timeoutMs Timeout duration in milliseconds
   * @param onTimeout Callback to invoke when timeout occurs
   */
  constructor(timeoutMs: number, onTimeout: () => void) {
    if (timeoutMs <= 0) {
      throw new Error('Timeout duration must be positive');
    }
    if (typeof onTimeout !== 'function') {
      throw new Error('onTimeout must be a function');
    }

    this.timeoutMs = timeoutMs;
    this.onTimeout = onTimeout;
  }

  /**
   * Start the inactivity timer
   */
  start(): void {
    this.clear();
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.onTimeout();
    }, this.timeoutMs);
  }

  /**
   * Reset the inactivity timer
   * Clears existing timer and starts a new one
   */
  reset(): void {
    if (this.timeoutId !== null) {
      this.start();
    }
  }

  /**
   * Clear the timeout and stop monitoring
   */
  clear(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Check if timeout is currently active
   * @returns true if timeout is running
   */
  isActive(): boolean {
    return this.timeoutId !== null;
  }

  /**
   * Get the configured timeout duration
   * @returns Timeout duration in milliseconds
   */
  getTimeoutMs(): number {
    return this.timeoutMs;
  }

  /**
   * Update the timeout duration
   * Does not affect currently running timer
   * @param timeoutMs New timeout duration in milliseconds
   */
  updateTimeout(timeoutMs: number): void {
    if (timeoutMs <= 0) {
      throw new Error('Timeout duration must be positive');
    }
    this.timeoutMs = timeoutMs;
  }
}
