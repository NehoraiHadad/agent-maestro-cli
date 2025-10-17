/**
 * OutputFormatter - Main output formatting orchestrator
 *
 * Coordinates multiple cleaners to produce clean, formatted output
 * from agent responses. Applies cleaning pipeline in order:
 * 1. Remove ANSI codes
 * 2. Remove agent metadata
 * 3. Remove delegation protocol strings
 * 4. Clean line breaks
 * 5. Trim whitespace
 */

import type { AgentName } from '../../shared/types/index.js';
import { AnsiCleaner } from './cleaners/AnsiCleaner.js';
import { MetadataCleaner } from './cleaners/MetadataCleaner.js';
import { DelegationCleaner } from './cleaners/DelegationCleaner.js';

export class OutputFormatter {
  private ansiCleaner: AnsiCleaner;
  private metadataCleaner: MetadataCleaner;
  private delegationCleaner: DelegationCleaner;

  constructor() {
    this.ansiCleaner = new AnsiCleaner();
    this.metadataCleaner = new MetadataCleaner();
    this.delegationCleaner = new DelegationCleaner();
  }

  /**
   * Format text for final output (full cleaning pipeline)
   */
  format(text: string, agentName: AgentName): string {
    if (!text) {
      return '';
    }

    // Apply full cleaning pipeline
    let result = text;
    result = this.ansiCleaner.clean(result);
    result = this.metadataCleaner.clean(result, agentName);
    result = this.delegationCleaner.clean(result);
    result = this.cleanLineBreaks(result);
    result = this.trim(result);

    return result;
  }

  /**
   * Format text for display (keeps some formatting, removes protocols)
   */
  formatForDisplay(text: string, agentName: AgentName): string {
    if (!text) {
      return '';
    }

    // Lighter cleaning for display - keep ANSI for terminal display
    let result = text;
    result = this.metadataCleaner.clean(result, agentName);
    result = this.delegationCleaner.clean(result);
    result = this.cleanLineBreaks(result);
    result = this.trim(result);

    return result;
  }

  /**
   * Format text for logging (remove everything including ANSI)
   */
  formatForLogging(text: string, agentName: AgentName): string {
    if (!text) {
      return '';
    }

    // Full cleaning for logs
    let result = text;
    result = this.ansiCleaner.clean(result);
    result = this.metadataCleaner.clean(result, agentName);
    result = this.delegationCleaner.clean(result);
    result = this.cleanLineBreaks(result);
    result = this.trim(result);

    return result;
  }

  /**
   * Clean excessive line breaks (max 2 consecutive newlines)
   */
  private cleanLineBreaks(text: string): string {
    // Replace 3 or more consecutive newlines with exactly 2
    return text.replace(/\n{3,}/g, '\n\n');
  }

  /**
   * Trim whitespace from start and end
   */
  private trim(text: string): string {
    return text.trim();
  }
}
