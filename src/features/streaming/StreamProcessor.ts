/**
 * Main processor for streaming events
 * Coordinates parsing and processing of agent streaming events
 */

import { ParserFactory } from './parsers/ParserFactory.js';
import type { BaseParser } from './parsers/BaseParser.js';
import type { AgentName, StreamEvent, StatusUpdate } from '../../shared/types/index.js';

/**
 * Central processor for handling streaming events from all agents
 */
export class StreamProcessor {
  private parserCache: Map<AgentName, BaseParser> = new Map();

  /**
   * Initialize stream processor
   */
  constructor() {
    // Parser cache is initialized empty and populated on demand
  }

  /**
   * Process streaming event data and extract status update
   * @param agentName - Name of the agent generating the event
   * @param eventData - Raw event data string
   * @returns Status update or null if event should be ignored
   */
  processEvent(agentName: AgentName, eventData: string): StatusUpdate | null {
    try {
      // Parse JSON event
      const event = this.parseJSONEvent(eventData);
      if (!event) return null;

      // Get appropriate parser
      const parser = this.getParser(agentName);

      // Parse event and return status update
      return parser.parseEvent(event);
    } catch (error) {
      // Silently ignore parsing errors for malformed events
      return null;
    }
  }

  /**
   * Extract response content from streaming event
   * @param agentName - Name of the agent
   * @param eventData - Raw event data string
   * @returns Response content or null
   */
  extractResponse(agentName: AgentName, eventData: string): string | null {
    try {
      const event = this.parseJSONEvent(eventData);
      if (!event) return null;

      const parser = this.getParser(agentName);
      return parser.extractResponse(event);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get parser for agent (with caching)
   * @param agentName - Name of the agent
   * @returns Parser instance
   */
  private getParser(agentName: AgentName): BaseParser {
    // Check cache first
    if (this.parserCache.has(agentName)) {
      return this.parserCache.get(agentName)!;
    }

    // Create new parser and cache it
    const parser = ParserFactory.createParser(agentName);
    this.parserCache.set(agentName, parser);

    return parser;
  }

  /**
   * Parse JSON event data safely
   * @param data - Raw event data string
   * @returns Parsed event or null if parsing fails
   */
  private parseJSONEvent(data: string): StreamEvent | null {
    try {
      // Remove any leading/trailing whitespace
      const trimmed = data.trim();
      if (!trimmed) return null;

      // Try to parse as JSON
      const parsed = JSON.parse(trimmed);

      // Validate that it has a type field
      if (!parsed || typeof parsed.type !== 'string') {
        return null;
      }

      return parsed as StreamEvent;
    } catch (error) {
      // Not valid JSON, return null
      return null;
    }
  }

  /**
   * Clear parser cache
   */
  clearCache(): void {
    this.parserCache.clear();
  }

  /**
   * Get number of cached parsers
   */
  getCacheSize(): number {
    return this.parserCache.size;
  }
}
