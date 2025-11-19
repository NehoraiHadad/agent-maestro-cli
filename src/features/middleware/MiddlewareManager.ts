/**
 * MiddlewareManager - Manages middleware execution with before/after hooks
 */

import type {
  Middleware,
  MiddlewareContext,
  MiddlewareStats,
  MiddlewareManagerOptions
} from './types.js';
import type { AgentExecutionResult } from '../../shared/types/index.js';

/**
 * Manages middleware registration and execution
 */
export class MiddlewareManager {
  private middlewares: Map<string, Middleware> = new Map();
  private options: Required<MiddlewareManagerOptions>;
  private stats: Map<string, MiddlewareStats> = new Map();

  constructor(options: MiddlewareManagerOptions = {}) {
    this.options = {
      continueOnError: options.continueOnError ?? true,
      trackPerformance: options.trackPerformance ?? true,
      maxExecutionTime: options.maxExecutionTime ?? 5000, // 5 seconds default
    };
  }

  /**
   * Register a middleware
   * @param middleware - Middleware to register
   * @throws {Error} If middleware with same name already exists
   */
  use(middleware: Middleware): void {
    if (this.middlewares.has(middleware.name)) {
      throw new Error(`Middleware '${middleware.name}' is already registered`);
    }

    this.middlewares.set(middleware.name, middleware);

    // Initialize stats
    if (this.options.trackPerformance) {
      this.stats.set(middleware.name, {
        name: middleware.name,
        executionCount: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        errorCount: 0,
      });
    }
  }

  /**
   * Remove a middleware by name
   * @param name - Middleware name
   * @returns True if middleware was removed
   */
  remove(name: string): boolean {
    const removed = this.middlewares.delete(name);
    if (removed) {
      this.stats.delete(name);
    }
    return removed;
  }

  /**
   * Get all registered middlewares
   * @returns Array of middlewares sorted by priority
   */
  getAll(): Middleware[] {
    return Array.from(this.middlewares.values())
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Check if middleware exists
   * @param name - Middleware name
   * @returns True if middleware is registered
   */
  has(name: string): boolean {
    return this.middlewares.has(name);
  }

  /**
   * Clear all middlewares
   */
  clear(): void {
    this.middlewares.clear();
    this.stats.clear();
  }

  /**
   * Run before hooks on message
   * @param message - Original message
   * @param context - Execution context
   * @returns Modified message after all before hooks
   */
  async runBefore(message: string, context: MiddlewareContext): Promise<string> {
    let processedMessage = message;

    // Get middlewares sorted by priority (highest first)
    const middlewares = this.getAll();

    for (const middleware of middlewares) {
      if (middleware.before) {
        try {
          const startTime = Date.now();

          // Execute with timeout
          processedMessage = await this.executeWithTimeout(
            middleware.before(processedMessage, context),
            this.options.maxExecutionTime,
            `Middleware '${middleware.name}' before hook timed out`
          );

          // Track performance
          if (this.options.trackPerformance) {
            this.updateStats(middleware.name, Date.now() - startTime, false);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Track error
          if (this.options.trackPerformance) {
            this.updateStats(middleware.name, 0, true);
          }

          if (this.options.continueOnError) {
            console.warn(`Middleware '${middleware.name}' before hook failed: ${errorMessage}`);
            // Continue with unmodified message
          } else {
            throw new Error(`Middleware '${middleware.name}' before hook failed: ${errorMessage}`);
          }
        }
      }
    }

    return processedMessage;
  }

  /**
   * Run after hooks on result
   * @param result - Agent execution result
   * @param context - Execution context
   * @returns Modified result after all after hooks
   */
  async runAfter(
    result: AgentExecutionResult,
    context: MiddlewareContext
  ): Promise<AgentExecutionResult> {
    let processedResult = result;

    // Get middlewares sorted by priority (highest first)
    const middlewares = this.getAll();

    for (const middleware of middlewares) {
      if (middleware.after) {
        try {
          const startTime = Date.now();

          // Execute with timeout
          processedResult = await this.executeWithTimeout(
            middleware.after(processedResult, context),
            this.options.maxExecutionTime,
            `Middleware '${middleware.name}' after hook timed out`
          );

          // Track performance
          if (this.options.trackPerformance) {
            this.updateStats(middleware.name, Date.now() - startTime, false);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Track error
          if (this.options.trackPerformance) {
            this.updateStats(middleware.name, 0, true);
          }

          if (this.options.continueOnError) {
            console.warn(`Middleware '${middleware.name}' after hook failed: ${errorMessage}`);
            // Continue with unmodified result
          } else {
            throw new Error(`Middleware '${middleware.name}' after hook failed: ${errorMessage}`);
          }
        }
      }
    }

    return processedResult;
  }

  /**
   * Get middleware statistics
   * @returns Array of middleware stats
   */
  getStats(): MiddlewareStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get stats for a specific middleware
   * @param name - Middleware name
   * @returns Middleware stats or undefined
   */
  getMiddlewareStats(name: string): MiddlewareStats | undefined {
    return this.stats.get(name);
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    for (const [name] of this.stats) {
      this.stats.set(name, {
        name,
        executionCount: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        errorCount: 0,
      });
    }
  }

  /**
   * Update middleware statistics
   * @param name - Middleware name
   * @param executionTime - Execution time in ms
   * @param isError - Whether this was an error
   */
  private updateStats(name: string, executionTime: number, isError: boolean): void {
    const stats = this.stats.get(name);
    if (!stats) return;

    stats.executionCount += 1;
    stats.totalExecutionTime += executionTime;
    stats.averageExecutionTime = stats.totalExecutionTime / stats.executionCount;

    if (isError) {
      stats.errorCount += 1;
    }
  }

  /**
   * Execute a promise with timeout
   * @param promise - Promise to execute
   * @param timeoutMs - Timeout in milliseconds
   * @param timeoutMessage - Error message for timeout
   * @returns Promise result
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ]);
  }
}
