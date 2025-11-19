/**
 * Middleware system types
 * Provides before/after hooks for message and result processing
 */

import type { AgentExecutionResult } from '../../shared/types/index.js';

/**
 * Context passed to middleware functions
 */
export interface MiddlewareContext {
  /** Agent name */
  agent: string;
  /** Session ID if available */
  sessionId?: string;
  /** Timestamp of execution */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Middleware interface for pre/post processing
 */
export interface Middleware {
  /** Middleware name (must be unique) */
  readonly name: string;

  /** Optional description */
  readonly description?: string;

  /** Optional priority (higher runs first, default: 0) */
  readonly priority?: number;

  /**
   * Before hook - processes message before sending to agent
   * @param message - Original message
   * @param context - Execution context
   * @returns Modified message or original message
   */
  before?(message: string, context: MiddlewareContext): Promise<string>;

  /**
   * After hook - processes result after agent execution
   * @param result - Agent execution result
   * @param context - Execution context
   * @returns Modified result or original result
   */
  after?(result: AgentExecutionResult, context: MiddlewareContext): Promise<AgentExecutionResult>;
}

/**
 * Middleware execution stats
 */
export interface MiddlewareStats {
  /** Middleware name */
  name: string;
  /** Number of times executed */
  executionCount: number;
  /** Total execution time in milliseconds */
  totalExecutionTime: number;
  /** Average execution time in milliseconds */
  averageExecutionTime: number;
  /** Number of errors */
  errorCount: number;
}

/**
 * Middleware manager options
 */
export interface MiddlewareManagerOptions {
  /** Enable error handling (continue on middleware errors) */
  continueOnError?: boolean;
  /** Enable performance tracking */
  trackPerformance?: boolean;
  /** Maximum execution time per middleware in ms */
  maxExecutionTime?: number;
}
