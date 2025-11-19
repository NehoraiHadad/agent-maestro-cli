/**
 * Main processor for streaming events
 * Enhanced to extract structured events and provide rich rendering
 */

import { ParserFactory } from './parsers/ParserFactory.js';
import type { BaseParser } from './parsers/BaseParser.js';
import type { AgentName } from '../../shared/types/index.js';
import type {
  ProcessedStream,
  ExtractedEvent,
  StreamMetadata,
  ThinkingEvent,
  ToolUseEvent,
  ToolResultEvent,
  TextEvent
} from '../../shared/types/streaming.types.js';

/**
 * Enhanced processor for handling streaming data from agents
 * Extracts structured events (thinking, tool use, etc.) from streaming data
 */
export class StreamProcessor {
  private parserCache: Map<AgentName, BaseParser> = new Map();

  /**
   * Process streaming data with event extraction
   * @param agentName - Name of the agent generating the data
   * @param data - Raw data string
   * @returns Processed stream with extracted events
   */
  processData(agentName: AgentName, data: string): ProcessedStream {
    try {
      const parser = this.getParser(agentName);
      const text = parser.parseData(data) || '';

      // Extract structured events from the data
      const events = this.extractEvents(text);
      const metadata = this.buildMetadata(events);

      return {
        text,
        events,
        metadata
      };
    } catch (error) {
      // Return minimal processed stream on error
      return {
        text: data || '',
        events: [],
        metadata: {
          hasThinking: false,
          hasToolUse: false,
          toolsUsed: [],
          eventCount: 0
        }
      };
    }
  }

  /**
   * Extract structured events from text
   * @param text - Text to extract events from
   * @returns Array of extracted events
   */
  private extractEvents(text: string): ExtractedEvent[] {
    const events: ExtractedEvent[] = [];
    const timestamp = Date.now();

    // Extract thinking blocks
    const thinkingEvents = this.extractThinking(text, timestamp);
    events.push(...thinkingEvents);

    // Extract tool use events
    const toolEvents = this.extractToolUse(text, timestamp);
    events.push(...toolEvents);

    // Extract tool result events
    const resultEvents = this.extractToolResults(text, timestamp);
    events.push(...resultEvents);

    // If no structured events found, add as text event
    if (events.length === 0 && text.trim()) {
      events.push({
        type: 'text',
        content: text,
        timestamp
      } as TextEvent);
    }

    return events;
  }

  /**
   * Extract thinking blocks from text
   * Looks for patterns like <thinking>...</thinking> or similar markers
   * @param text - Text to extract from
   * @param timestamp - Timestamp for events
   * @returns Array of thinking events
   */
  private extractThinking(text: string, timestamp: number): ThinkingEvent[] {
    const events: ThinkingEvent[] = [];

    // Match thinking blocks with XML-style tags
    const thinkingPattern = /<thinking>([\s\S]*?)<\/thinking>/gi;
    let match;

    while ((match = thinkingPattern.exec(text)) !== null) {
      events.push({
        type: 'thinking',
        content: match[1].trim(),
        timestamp
      });
    }

    // Also check for markdown-style thinking blocks
    const mdThinkingPattern = /```thinking\n([\s\S]*?)```/gi;
    while ((match = mdThinkingPattern.exec(text)) !== null) {
      events.push({
        type: 'thinking',
        content: match[1].trim(),
        timestamp
      });
    }

    return events;
  }

  /**
   * Extract tool use events from text
   * Looks for tool invocation patterns
   * @param text - Text to extract from
   * @param timestamp - Timestamp for events
   * @returns Array of tool use events
   */
  private extractToolUse(text: string, timestamp: number): ToolUseEvent[] {
    const events: ToolUseEvent[] = [];

    // Try to parse as JSON for tool_use content blocks
    try {
      // Look for tool_use blocks in JSON format
      const toolUsePattern = /"type":\s*"tool_use"[\s\S]*?"name":\s*"([^"]+)"[\s\S]*?"input":\s*(\{[^}]*\})/gi;
      let match;

      while ((match = toolUsePattern.exec(text)) !== null) {
        try {
          const toolName = match[1];
          const input = JSON.parse(match[2]);

          events.push({
            type: 'tool_use',
            toolName,
            input,
            timestamp
          });
        } catch {
          // Skip invalid JSON
        }
      }
    } catch {
      // Not JSON, skip
    }

    // Also look for simpler patterns like "Using tool: X"
    const simpleToolPattern = /(?:Using|Calling)\s+(?:tool|function):\s*(\w+)/gi;
    let match;
    while ((match = simpleToolPattern.exec(text)) !== null) {
      events.push({
        type: 'tool_use',
        toolName: match[1],
        input: {},
        timestamp
      });
    }

    return events;
  }

  /**
   * Extract tool result events from text
   * Looks for tool result patterns
   * @param text - Text to extract from
   * @param timestamp - Timestamp for events
   * @returns Array of tool result events
   */
  private extractToolResults(text: string, timestamp: number): ToolResultEvent[] {
    const events: ToolResultEvent[] = [];

    // Look for tool_result blocks in JSON format
    try {
      const toolResultPattern = /"type":\s*"tool_result"[\s\S]*?"tool_use_id":\s*"([^"]+)"[\s\S]*?"content":\s*"([^"]*)"(?:[\s\S]*?"is_error":\s*(true|false))?/gi;
      let match;

      while ((match = toolResultPattern.exec(text)) !== null) {
        const toolUseId = match[1];
        const content = match[2];
        const isError = match[3] === 'true';

        events.push({
          type: 'tool_result',
          toolName: toolUseId,
          output: content,
          isError,
          timestamp
        });
      }
    } catch {
      // Not JSON, skip
    }

    return events;
  }

  /**
   * Build metadata from extracted events
   * @param events - Array of extracted events
   * @returns Stream metadata
   */
  private buildMetadata(events: ExtractedEvent[]): StreamMetadata {
    const hasThinking = events.some(e => e.type === 'thinking');
    const hasToolUse = events.some(e => e.type === 'tool_use' || e.type === 'tool_result');

    const toolsUsed = events
      .filter((e): e is ToolUseEvent => e.type === 'tool_use')
      .map(e => e.toolName)
      .filter((name, index, self) => self.indexOf(name) === index); // unique

    return {
      hasThinking,
      hasToolUse,
      toolsUsed,
      eventCount: events.length
    };
  }

  /**
   * Get parser for agent (with caching)
   * @param agentName - Name of the agent
   * @returns Parser instance
   */
  private getParser(agentName: AgentName): BaseParser {
    if (this.parserCache.has(agentName)) {
      return this.parserCache.get(agentName)!;
    }

    const parser = ParserFactory.createParser(agentName);
    this.parserCache.set(agentName, parser);
    return parser;
  }

  /**
   * Clear parser cache
   */
  clearCache(): void {
    this.parserCache.clear();
  }
}
