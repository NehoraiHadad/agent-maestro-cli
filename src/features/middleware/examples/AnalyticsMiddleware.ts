/**
 * AnalyticsMiddleware - Tracks usage analytics and metrics
 * Demonstrates event tracking and metrics collection
 */

import type { Middleware, MiddlewareContext } from '../types.js';
import type { AgentExecutionResult } from '../../../shared/types/index.js';

export interface AnalyticsEvent {
  type: 'message_sent' | 'response_received' | 'error_occurred';
  timestamp: number;
  agent: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsOptions {
  /** Enable console logging */
  enableLogging?: boolean;
  /** Custom analytics handler */
  onEvent?: (event: AnalyticsEvent) => void | Promise<void>;
}

/**
 * Analytics middleware for tracking usage and performance metrics
 */
export class AnalyticsMiddleware implements Middleware {
  readonly name = 'analytics';
  readonly description = 'Track usage analytics and metrics';
  readonly priority = -10; // Low priority to run after others

  private options: Required<AnalyticsOptions>;
  private events: AnalyticsEvent[] = [];

  constructor(options: AnalyticsOptions = {}) {
    this.options = {
      enableLogging: options.enableLogging ?? false,
      onEvent: options.onEvent ?? (() => {}),
    };
  }

  /**
   * Before hook - track message sent
   */
  async before(message: string, context: MiddlewareContext): Promise<string> {
    const event: AnalyticsEvent = {
      type: 'message_sent',
      timestamp: context.timestamp,
      agent: context.agent,
      sessionId: context.sessionId,
      metadata: {
        messageLength: message.length,
        ...context.metadata,
      },
    };

    await this.trackEvent(event);

    return message; // Pass through unchanged
  }

  /**
   * After hook - track response received
   */
  async after(
    result: AgentExecutionResult,
    context: MiddlewareContext
  ): Promise<AgentExecutionResult> {
    const event: AnalyticsEvent = {
      type: 'response_received',
      timestamp: Date.now(),
      agent: context.agent,
      sessionId: context.sessionId,
      metadata: {
        exitCode: result.exitCode,
        responseLength: result.content.length,
        executionTime: Date.now() - context.timestamp,
        ...context.metadata,
      },
    };

    await this.trackEvent(event);

    return result; // Pass through unchanged
  }

  /**
   * Track analytics event
   */
  private async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Store event
    this.events.push(event);

    // Log if enabled
    if (this.options.enableLogging) {
      console.log(`[Analytics] ${event.type}:`, event.metadata);
    }

    // Call custom handler
    try {
      await this.options.onEvent(event);
    } catch (error) {
      // Silently fail - analytics should not break execution
      if (this.options.enableLogging) {
        console.warn('[Analytics] Event handler failed:', error);
      }
    }
  }

  /**
   * Get all tracked events
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: AnalyticsEvent['type']): AnalyticsEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Get analytics summary
   */
  getSummary(): {
    totalMessages: number;
    totalResponses: number;
    totalErrors: number;
    averageResponseTime: number;
    averageMessageLength: number;
    averageResponseLength: number;
  } {
    const messages = this.getEventsByType('message_sent');
    const responses = this.getEventsByType('response_received');
    const errors = this.getEventsByType('error_occurred');

    const responseTimes = responses
      .map(e => e.metadata?.executionTime as number)
      .filter(t => typeof t === 'number');

    const messageLengths = messages
      .map(e => e.metadata?.messageLength as number)
      .filter(l => typeof l === 'number');

    const responseLengths = responses
      .map(e => e.metadata?.responseLength as number)
      .filter(l => typeof l === 'number');

    return {
      totalMessages: messages.length,
      totalResponses: responses.length,
      totalErrors: errors.length,
      averageResponseTime: responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0,
      averageMessageLength: messageLengths.length > 0
        ? messageLengths.reduce((a, b) => a + b, 0) / messageLengths.length
        : 0,
      averageResponseLength: responseLengths.length > 0
        ? responseLengths.reduce((a, b) => a + b, 0) / responseLengths.length
        : 0,
    };
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events = [];
  }
}
