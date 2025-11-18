/**
 * Parser for Codex JSONL streaming events
 * Simplified to pass-through with minimal processing
 */

import { BaseParser } from './BaseParser.js';

/**
 * Codex-specific streaming event parser
 * Simply passes data through without complex interpretation
 */
export class CodexParser extends BaseParser {
  /**
   * Simple pass-through parsing
   * @param data - Raw data string
   * @returns Data as-is or null if empty
   */
  parseData(data: string): string | null {
    if (!data || !data.trim()) {
      return null;
    }
    return data;
  }
}
