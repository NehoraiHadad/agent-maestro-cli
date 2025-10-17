/**
 * Abstract base class for all streaming event parsers
 * Provides common interface for parsing agent-specific streaming events
 */

import type { StreamEvent, StatusUpdate } from '../../../shared/types/index.js';

/**
 * Abstract parser for streaming events
 * Each agent implementation must extend this class
 */
export abstract class BaseParser {
  /**
   * Parse streaming event into status update
   * @param event - Raw streaming event
   * @returns Status update object or null if event should be ignored
   */
  abstract parseEvent(event: StreamEvent): StatusUpdate | null;

  /**
   * Extract status message from event
   * @param event - Raw streaming event
   * @returns Status string or null
   */
  abstract extractStatus(event: StreamEvent): string | null;

  /**
   * Extract response content from event
   * @param event - Raw streaming event
   * @returns Response content or null
   */
  abstract extractResponse(event: StreamEvent): string | null;

  /**
   * Check if event has specific type
   * @param event - Streaming event to check
   * @param type - Event type to match
   * @returns True if event type matches
   */
  protected hasType(event: StreamEvent, type: string): boolean {
    return event.type === type;
  }

  /**
   * Create status update object
   * @param status - Status message
   * @param color - Optional color for display
   * @returns StatusUpdate object
   */
  protected createStatusUpdate(status: string, color?: string): StatusUpdate {
    return {
      status,
      color,
      timestamp: new Date(),
    };
  }

  /**
   * Check if event data exists
   * @param data - Data to check
   * @returns True if data is not null/undefined
   */
  protected exists<T>(data: T | null | undefined): data is T {
    return data !== null && data !== undefined;
  }
}
