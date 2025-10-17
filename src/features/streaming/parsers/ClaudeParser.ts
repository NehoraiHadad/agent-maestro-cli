/**
 * Parser for Claude streaming events
 * Handles Anthropic Claude specific event formats
 */

import { BaseParser } from './BaseParser.js';
import type { ClaudeStreamEvent, StatusUpdate } from '../../../shared/types/index.js';

/**
 * Claude-specific streaming event parser
 */
export class ClaudeParser extends BaseParser {
  /**
   * Parse Claude streaming event into status update
   */
  parseEvent(event: ClaudeStreamEvent): StatusUpdate | null {
    const status = this.extractStatus(event);
    if (!status) return null;

    return this.createStatusUpdate(status, 'blue');
  }

  /**
   * Extract status message from Claude event
   */
  extractStatus(event: ClaudeStreamEvent): string | null {
    // System initialization
    if (this.hasType(event, 'system')) {
      if (event.subtype === 'init') {
        return 'initializing...';
      }
    }

    // Assistant message (responding)
    if (this.hasType(event, 'assistant')) {
      if (this.exists(event.message)) {
        return 'responding...';
      }
    }

    // Result (completed)
    if (this.hasType(event, 'result')) {
      return 'completed';
    }

    return null;
  }

  /**
   * Extract response content from Claude event
   */
  extractResponse(event: ClaudeStreamEvent): string | null {
    if (!event.message) return null;

    // Handle content as array of objects
    if (Array.isArray(event.message.content)) {
      const textParts = event.message.content
        .map(item => item.text)
        .filter(text => this.exists(text))
        .join('');

      return textParts || null;
    }

    // Handle content as string
    if (typeof event.message.content === 'string') {
      return event.message.content;
    }

    return null;
  }
}
