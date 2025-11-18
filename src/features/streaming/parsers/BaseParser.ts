/**
 * Abstract base class for all streaming event parsers
 * Simplified to minimal pass-through interface
 */

/**
 * Abstract parser for streaming events
 * Each agent implementation must extend this class
 */
export abstract class BaseParser {
  /**
   * Simple pass-through parsing
   * Returns data as-is without complex interpretation
   * @param data - Raw data string
   * @returns Data string or null if empty
   */
  abstract parseData(data: string): string | null;
}
