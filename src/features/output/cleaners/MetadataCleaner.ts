/**
 * MetadataCleaner - Removes agent-specific metadata from output
 *
 * Cleans up metadata headers, footers, and labels that agents
 * add to their output but should not be included in final results.
 */

import type { AgentName } from '../../../shared/types/index.js';

export class MetadataCleaner {
  /**
   * Clean metadata based on agent type
   */
  clean(text: string, agentName: AgentName): string {
    if (!text) {
      return '';
    }

    switch (agentName) {
      case 'codex':
        return this.cleanCodexMetadata(text);
      case 'claude':
        return this.cleanClaudeMetadata(text);
      case 'gemini':
        return this.cleanGeminiMetadata(text);
      default:
        return text;
    }
  }

  /**
   * Clean Codex-specific metadata
   */
  private cleanCodexMetadata(text: string): string {
    let result = text;

    // Remove Codex version header (e.g., "OpenAI Codex v1.2.3...")
    result = result.replace(/^OpenAI Codex v[\d.]+[^\n]*\n?/gm, '');

    // Remove tokens used footer (e.g., "tokens used\n12345")
    result = result.replace(/tokens used\n\d+\n?/gi, '');

    // Remove standalone "codex" label at start
    result = result.replace(/^codex\n/i, '');

    // Remove "OpenAI" standalone references
    result = result.replace(/^OpenAI\n/gm, '');

    return result.trim();
  }

  /**
   * Clean Claude-specific metadata
   */
  private cleanClaudeMetadata(text: string): string {
    let result = text;

    // Remove Claude version headers if they exist
    result = result.replace(/^Claude (Code|AI) v[\d.]+[^\n]*\n?/gm, '');

    // Remove standalone "claude" label
    result = result.replace(/^claude\n/i, '');

    // Remove "Anthropic" standalone references
    result = result.replace(/^Anthropic\n/gm, '');

    return result.trim();
  }

  /**
   * Clean Gemini-specific metadata
   */
  private cleanGeminiMetadata(text: string): string {
    let result = text;

    // Remove "Loaded cached credentials." message
    result = result.replace(/Loaded cached credentials\.\n?/g, '');

    // Remove Gemini version headers
    result = result.replace(/^Google Gemini v[\d.]+[^\n]*\n?/gm, '');

    // Remove standalone "gemini" label
    result = result.replace(/^gemini\n/i, '');

    // Remove "Google AI" standalone references
    result = result.replace(/^Google AI\n/gm, '');

    return result.trim();
  }
}
