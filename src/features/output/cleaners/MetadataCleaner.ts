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

    // Extract text from JSONL streaming events
    result = this.extractFromCodexJsonl(result);

    // Remove Codex version header (e.g., "OpenAI Codex v1.2.3...")
    result = result.replace(/^OpenAI Codex v[\d.]+[^\n]*\n?/gm, '');

    // Remove tokens used footer (e.g., "tokens used\n12345")
    result = result.replace(/tokens used\n\d+\n?/gi, '');

    // Remove standalone "codex" label at start
    result = result.replace(/^codex\n/i, '');

    // Remove "OpenAI" standalone references
    result = result.replace(/^OpenAI\n/gm, '');

    // Remove session/thread metadata lines
    result = result.replace(/^(workdir|model|provider|approval|sandbox|reasoning effort|reasoning summaries|session id):.*$/gm, '');

    // Remove separator lines
    result = result.replace(/^-{8,}$/gm, '');

    return result.trim();
  }

  /**
   * Extract agent messages from Codex JSONL streaming format
   */
  private extractFromCodexJsonl(text: string): string {
    // Check if text contains JSONL events
    if (!text.includes('{"type":')) {
      return text;
    }

    const lines = text.split('\n');
    const messages: string[] = [];

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

        // Extract agent messages
        if (event.type === 'item.completed' && event.item) {
          if (event.item.type === 'agent_message' && event.item.text) {
            messages.push(event.item.text);
          }
          // Optionally include reasoning
          // if (event.item.type === 'reasoning' && event.item.text) {
          //   messages.push(`[Reasoning: ${event.item.text}]`);
          // }
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
