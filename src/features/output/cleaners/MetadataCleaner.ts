/**
 * MetadataCleaner - Removes agent-specific metadata from output
 *
 * Cleans up metadata headers, footers, and labels that agents
 * add to their output but should not be included in final results.
 *
 * AgentMaestro only supports Claude Code
 */

import type { AgentName } from '../../../shared/types/index.js';

export class MetadataCleaner {
  /**
   * Clean metadata based on agent type
   * AgentMaestro only supports Claude Code
   */
  clean(text: string, _agentName: AgentName): string {
    if (!text) {
      return '';
    }

    // AgentMaestro only supports Claude
    return this.cleanClaudeMetadata(text);
  }

  /**
   * Clean Claude-specific metadata
   */
  private cleanClaudeMetadata(text: string): string {
    let result = text;

    // Extract text from JSON streaming events
    result = this.extractFromClaudeJson(result);

    // Remove Claude version headers if they exist
    result = result.replace(/^Claude (Code|AI) v[\d.]+[^\n]*\n?/gm, '');

    // Remove standalone "claude" label
    result = result.replace(/^claude\n/i, '');

    // Remove "Anthropic" standalone references
    result = result.replace(/^Anthropic\n/gm, '');

    return result.trim();
  }

  /**
   * Extract assistant messages from Claude stream-json format
   */
  private extractFromClaudeJson(text: string): string {
    // Check if text contains JSON events
    if (!text.includes('{"type":')) {
      return text;
    }

    const lines = text.split('\n');
    const messages: string[] = [];
    let hasResult = false;

    // First pass: check if we have a result event
    for (const line of lines) {
      if (line.trim() && line.startsWith('{')) {
        try {
          const event = JSON.parse(line);
          if (event.type === 'result' && event.result) {
            hasResult = true;
            break;
          }
        } catch {
          // ignore
        }
      }
    }

    // Second pass: extract messages
    for (const line of lines) {
      if (!line.trim() || !line.startsWith('{')) {
        // Keep non-JSON lines
        if (line.trim() && !line.startsWith('{"type":')) {
          messages.push(line);
        }
        continue;
      }

      try {
        const event = JSON.parse(line);

        // If we have a result event, only use that (it's the final answer)
        if (hasResult) {
          if (event.type === 'result' && event.result) {
            messages.push(event.result);
          }
        } else {
          // Otherwise extract assistant messages
          if (event.type === 'assistant' && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === 'text' && block.text) {
                messages.push(block.text);
              }
            }
          }
        }
      } catch {
        // Not valid JSON, keep as-is if not an event
        if (!line.startsWith('{"type":')) {
          messages.push(line);
        }
      }
    }

    return messages.join('\n');
  }
}
