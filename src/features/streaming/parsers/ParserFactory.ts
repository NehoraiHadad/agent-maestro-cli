/**
 * Factory for creating agent-specific parsers
 * Simplified for minimal pass-through parsing
 */

import { BaseParser } from './BaseParser.js';
import { CodexParser } from './CodexParser.js';
import { ClaudeParser } from './ClaudeParser.js';
import { GeminiParser } from './GeminiParser.js';
import type { AgentName } from '../../../shared/types/index.js';

/**
 * Factory class for creating streaming parsers
 */
export class ParserFactory {
  /**
   * Create parser for the given agent
   * @param agentName - Name of the agent
   * @returns Parser instance
   */
  static createParser(agentName: AgentName): BaseParser {
    const parsers: Record<AgentName, () => BaseParser> = {
      codex: () => new CodexParser(),
      claude: () => new ClaudeParser(),
      gemini: () => new GeminiParser(),
    };

    return parsers[agentName]?.() ?? new ClaudeParser();
  }
}
