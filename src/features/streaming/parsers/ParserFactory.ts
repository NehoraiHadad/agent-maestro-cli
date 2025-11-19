/**
 * Factory for creating agent-specific parsers
 * Simplified for Claude-only support
 */

import { BaseParser } from './BaseParser.js';
import { ClaudeParser } from './ClaudeParser.js';
import type { AgentName } from '../../../shared/types/index.js';

/**
 * Factory class for creating streaming parsers
 * AgentMaestro only supports Claude Code
 */
export class ParserFactory {
  /**
   * Create parser for the given agent
   * @param _agentName - Name of the agent (only 'claude' is supported)
   * @returns Parser instance
   */
  static createParser(_agentName: AgentName): BaseParser {
    // AgentMaestro only supports Claude Code
    return new ClaudeParser();
  }
}
