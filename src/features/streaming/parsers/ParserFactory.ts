/**
 * Factory for creating agent-specific parsers
 * Implements factory pattern for parser instantiation
 */

import { BaseParser } from './BaseParser.js';
import { CodexParser } from './CodexParser.js';
import { ClaudeParser } from './ClaudeParser.js';
import { GeminiParser } from './GeminiParser.js';
import type { AgentName } from '../../../shared/types/index.js';

/**
 * Factory class for creating streaming event parsers
 */
export class ParserFactory {
  /**
   * Create appropriate parser for the given agent
   * @param agentName - Name of the agent
   * @returns Parser instance for the agent
   * @throws Error if agent name is not supported
   */
  static createParser(agentName: AgentName): BaseParser {
    const parsers: Record<AgentName, () => BaseParser> = {
      codex: () => new CodexParser(),
      claude: () => new ClaudeParser(),
      gemini: () => new GeminiParser(),
    };

    const parserFactory = parsers[agentName];

    if (!parserFactory) {
      throw new Error(`Unsupported agent: ${agentName}`);
    }

    return parserFactory();
  }

  /**
   * Check if parser exists for agent
   * @param agentName - Name of the agent
   * @returns True if parser exists
   */
  static hasParser(agentName: string): agentName is AgentName {
    return agentName === 'codex' || agentName === 'claude' || agentName === 'gemini';
  }
}
