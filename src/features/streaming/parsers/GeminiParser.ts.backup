/**
 * Parser for Gemini streaming events
 * Handles Google Gemini specific event formats
 */

import { BaseParser } from './BaseParser.js';
import type { GeminiStreamEvent, StatusUpdate } from '../../../shared/types/index.js';

/**
 * Gemini-specific streaming event parser
 */
export class GeminiParser extends BaseParser {
  /**
   * Parse Gemini streaming event into status update
   */
  parseEvent(event: GeminiStreamEvent): StatusUpdate | null {
    const status = this.extractStatus(event);
    if (!status) return null;

    // Use yellow color for Gemini
    return this.createStatusUpdate(status, 'yellow');
  }

  /**
   * Extract status message from Gemini event
   */
  extractStatus(event: GeminiStreamEvent): string | null {
    // Initialization
    if (this.hasType(event, 'init')) {
      return 'initializing...';
    }

    // Message/thinking
    if (this.hasType(event, 'message')) {
      return 'thinking...';
    }

    // Tool use
    if (this.hasType(event, 'tool_use')) {
      if (event.tool?.name) {
        return `using tool: ${event.tool.name}`;
      }
      return 'using tool...';
    }

    // Tool result
    if (this.hasType(event, 'tool_result')) {
      return 'processing tool result...';
    }

    // Result/completed
    if (this.hasType(event, 'result')) {
      return 'completed';
    }

    // Error
    if (this.hasType(event, 'error')) {
      return 'error occurred';
    }

    return null;
  }

  /**
   * Extract response content from Gemini event
   */
  extractResponse(event: GeminiStreamEvent): string | null {
    // Check for response field
    if (this.exists(event.response)) {
      return event.response;
    }

    // Check for text field
    if (this.exists(event.text)) {
      return event.text;
    }

    // For result events, try to extract any text content
    if (this.hasType(event, 'result')) {
      return event.response || event.text || null;
    }

    return null;
  }
}
