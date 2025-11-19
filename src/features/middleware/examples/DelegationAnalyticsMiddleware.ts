/**
 * DelegationAnalyticsMiddleware - Track delegation events for analytics
 * Integrates with DelegationAnalytics to record delegation patterns
 */

import type { Middleware, MiddlewareContext } from '../types.js';
import type { AgentExecutionResult } from '../../../shared/types/index.js';
import type { DelegationEvent } from '../../../shared/types/delegation.types.js';
import { DelegationAnalytics } from '../../analytics/DelegationAnalytics.js';

export interface DelegationAnalyticsMiddlewareOptions {
  /** DelegationAnalytics instance to use (optional) */
  analytics?: DelegationAnalytics;
  /** Enable console logging */
  enableLogging?: boolean;
}

/**
 * Middleware for tracking delegation events in analytics
 */
export class DelegationAnalyticsMiddleware implements Middleware {
  readonly name = 'delegation-analytics';
  readonly description = 'Track delegation events for analytics and reporting';
  readonly priority = -5; // Run after most middleware but before general analytics

  private analytics: DelegationAnalytics;
  private enableLogging: boolean;
  private pendingDelegations: Map<string, {
    event: DelegationEvent;
    startTime: number;
  }> = new Map();

  constructor(options: DelegationAnalyticsMiddlewareOptions = {}) {
    this.analytics = options.analytics || new DelegationAnalytics();
    this.enableLogging = options.enableLogging ?? false;
  }

  /**
   * Initialize the middleware
   */
  async initialize(): Promise<void> {
    await this.analytics.initialize();
  }

  /**
   * Before hook - detect delegation start
   */
  async before(message: string, context: MiddlewareContext): Promise<string> {
    // Check if this is a delegation event
    const delegationInfo = this.extractDelegationInfo(message, context);

    if (delegationInfo) {
      const eventId = this.generateEventId(context);
      const event: DelegationEvent = {
        id: eventId,
        from: delegationInfo.from,
        to: delegationInfo.to,
        task: delegationInfo.task,
        timestamp: context.timestamp,
      };

      // Store as pending to track duration
      this.pendingDelegations.set(eventId, {
        event,
        startTime: context.timestamp,
      });

      if (this.enableLogging) {
        console.log(`[DelegationAnalytics] Tracking delegation: ${event.from} → ${event.to}`);
      }
    }

    return message; // Pass through unchanged
  }

  /**
   * After hook - complete delegation tracking
   */
  async after(
    result: AgentExecutionResult,
    context: MiddlewareContext
  ): Promise<AgentExecutionResult> {
    const eventId = this.generateEventId(context);
    const pending = this.pendingDelegations.get(eventId);

    if (pending) {
      // Calculate duration and determine success
      const duration = Date.now() - pending.startTime;
      const success = result.exitCode === 0;

      const completedEvent: DelegationEvent = {
        ...pending.event,
        duration,
        success,
        error: result.exitCode !== 0 ? result.content : undefined,
      };

      // Track the completed event
      await this.analytics.track(completedEvent);

      // Remove from pending
      this.pendingDelegations.delete(eventId);

      if (this.enableLogging) {
        console.log(
          `[DelegationAnalytics] Completed delegation: ${completedEvent.from} → ${completedEvent.to} ` +
          `(${duration}ms, ${success ? 'success' : 'failed'})`
        );
      }
    }

    return result; // Pass through unchanged
  }

  /**
   * Extract delegation information from message and context
   */
  private extractDelegationInfo(
    message: string,
    context: MiddlewareContext
  ): { from: string; to: string; task: string } | null {
    // Check metadata for delegation info
    if (context.metadata?.delegationFrom && context.metadata?.delegationTo) {
      return {
        from: context.metadata.delegationFrom as string,
        to: context.metadata.delegationTo as string,
        task: message,
      };
    }

    // Check if message indicates a delegation pattern
    // Pattern: "delegate to <agent>: <task>" or similar
    const delegationPatterns = [
      /delegate\s+to\s+(\w+):\s*(.+)/i,
      /ask\s+(\w+)\s+to\s+(.+)/i,
      /send\s+to\s+(\w+):\s*(.+)/i,
    ];

    for (const pattern of delegationPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          from: context.agent,
          to: match[1],
          task: match[2],
        };
      }
    }

    return null;
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(context: MiddlewareContext): string {
    return `${context.sessionId || 'unknown'}_${context.timestamp}`;
  }

  /**
   * Get the analytics instance
   */
  getAnalytics(): DelegationAnalytics {
    return this.analytics;
  }

  /**
   * Get delegation statistics
   */
  getStats() {
    return this.analytics.getStats();
  }

  /**
   * Generate analytics report
   */
  generateReport(timeRange?: { start: Date; end: Date }) {
    return this.analytics.generateReport(timeRange);
  }

  /**
   * Export analytics data
   */
  export(format: 'json' | 'csv'): string {
    return this.analytics.export(format);
  }

  /**
   * Clear all analytics data
   */
  async clear(): Promise<void> {
    await this.analytics.clear();
    this.pendingDelegations.clear();
  }
}
