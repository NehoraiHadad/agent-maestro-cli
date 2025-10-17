/**
 * Normalizes streaming events to common format
 * Handles JSONL parsing and event sanitization
 */

import type { StreamEvent } from '../../shared/types/index.js';

/**
 * Event normalizer for streaming data
 * Converts raw streaming data into normalized event objects
 */
export class EventNormalizer {
  /**
   * Normalize a single raw event string
   * @param raw - Raw event string
   * @returns Normalized event or null if parsing fails
   */
  normalizeEvent(raw: string): StreamEvent | null {
    try {
      // Sanitize the JSON string
      const sanitized = this.sanitizeJSON(raw);
      if (!sanitized) return null;

      // Parse as JSON
      const parsed = JSON.parse(sanitized);

      // Validate basic structure
      if (!this.isValidEvent(parsed)) {
        return null;
      }

      return parsed as StreamEvent;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse JSONL buffer into array of events
   * @param buffer - Buffer containing JSONL data
   * @returns Array of normalized events
   */
  parseJSONL(buffer: string): StreamEvent[] {
    const events: StreamEvent[] = [];

    // Split by newlines
    const lines = buffer.split('\n');

    for (const line of lines) {
      const event = this.normalizeEvent(line);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Sanitize JSON string
   * Removes common issues that prevent parsing
   * @param str - Raw JSON string
   * @returns Sanitized string or empty string if invalid
   */
  private sanitizeJSON(str: string): string {
    // Remove whitespace
    let sanitized = str.trim();

    // Empty string check
    if (!sanitized) return '';

    // Remove trailing commas before closing braces/brackets
    sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');

    // Remove BOM if present
    if (sanitized.charCodeAt(0) === 0xfeff) {
      sanitized = sanitized.slice(1);
    }

    // Remove any control characters except newline/tab
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');

    return sanitized;
  }

  /**
   * Validate that parsed object is a valid event
   * @param obj - Parsed object to validate
   * @returns True if object is valid event
   */
  private isValidEvent(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const event = obj as Record<string, unknown>;

    // Must have type field
    if (!event.type || typeof event.type !== 'string') {
      return false;
    }

    return true;
  }
}
