/**
 * Main processor for streaming events
 * Simplified to minimal pass-through processing
 */

import { ParserFactory } from './parsers/ParserFactory.js';
import type { BaseParser } from './parsers/BaseParser.js';
import type { AgentName } from '../../shared/types/index.js';

/**
 * Simplified processor for handling streaming data from agents
 */
export class StreamProcessor {
  private parserCache: Map<AgentName, BaseParser> = new Map();

  /**
   * Process streaming data with simple pass-through
   * @param agentName - Name of the agent generating the data
   * @param data - Raw data string
   * @returns Processed data or null
   */
  processData(agentName: AgentName, data: string): string | null {
    try {
      const parser = this.getParser(agentName);
      return parser.parseData(data);
    } catch (error) {
      // Return data as-is on error
      return data || null;
    }
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
