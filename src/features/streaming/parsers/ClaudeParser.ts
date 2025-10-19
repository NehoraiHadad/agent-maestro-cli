/**
 * Parser for Claude streaming events
 * Handles Anthropic Claude specific event formats
 */

import { BaseParser } from './BaseParser.js';
import type { ClaudeStreamEvent, StatusUpdate } from '../../../shared/types/index.js';
import { truncate } from '../../../shared/utils/index.js';
import { formatBashCommand, extractFilename } from './CommandFormatter.js';

/**
 * Claude-specific streaming event parser
 */
export class ClaudeParser extends BaseParser {
  /**
   * Parse Claude streaming event into status update
   */
  parseEvent(event: ClaudeStreamEvent): StatusUpdate | null {
    const status = this.extractStatus(event);
    if (!status) return null;

    return this.createStatusUpdate(status, 'blue');
  }

  /**
   * Extract status message from Claude event
   */
  extractStatus(event: ClaudeStreamEvent): string | null {
    // System initialization
    if (this.hasType(event, 'system')) {
      if (event.subtype === 'init') {
        return 'initializing...';
      }
    }

    // User message (tool results)
    if (this.hasType(event, 'user')) {
      return this.extractToolResultStatus(event);
    }

    // Assistant message - check for tool use or text
    if (this.hasType(event, 'assistant')) {
      return this.extractAssistantStatus(event);
    }

    // Result (completed)
    if (this.hasType(event, 'result')) {
      return 'completed';
    }

    return null;
  }

  /**
   * Extract status from assistant message (tool use or thinking)
   */
  private extractAssistantStatus(event: ClaudeStreamEvent): string | null {
    if (!event.message || !Array.isArray(event.message.content)) {
      return 'responding...';
    }

    // Check each content block
    for (const block of event.message.content) {
      // Tool use block
      if (block.type === 'tool_use' && block.name) {
        return this.formatToolUseStatus(block.name, block.input);
      }

      // Text block - show thinking snippet
      if (block.type === 'text' && block.text) {
        return `thinking: ${truncate(block.text, 60)}`;
      }
    }

    return 'responding...';
  }

  /**
   * Extract status from user message (tool results)
   */
  private extractToolResultStatus(event: ClaudeStreamEvent): string | null {
    if (!event.message || !Array.isArray(event.message.content)) {
      return null;
    }

    // Find tool result blocks
    for (const block of event.message.content) {
      if (block.type === 'tool_result' && block.tool_use_id) {
        if (block.is_error) {
          return 'tool execution failed';
        }
        return 'processing tool result...';
      }
    }

    return null;
  }

  /**
   * Format tool use into readable status message
   */
  private formatToolUseStatus(toolName: string, input?: Record<string, unknown>): string {
    // Handle Bash tool specially to show command details
    if (toolName === 'Bash' && input?.command) {
      return this.formatBashCommand(input.command as string);
    }

    // Handle Read tool
    if (toolName === 'Read' && input?.file_path) {
      const filename = extractFilename(input.file_path as string);
      return `reading: ${filename}`;
    }

    // Handle Edit tool
    if (toolName === 'Edit' && input?.file_path) {
      const filename = extractFilename(input.file_path as string);
      return `editing: ${filename}`;
    }

    // Handle Write tool
    if (toolName === 'Write' && input?.file_path) {
      const filename = extractFilename(input.file_path as string);
      return `writing: ${filename}`;
    }

    // Handle Grep tool
    if (toolName === 'Grep' && input?.pattern) {
      return `searching: ${truncate(input.pattern as string, 40)}`;
    }

    // Handle Glob tool
    if (toolName === 'Glob' && input?.pattern) {
      return `finding files: ${input.pattern}`;
    }

    // Handle Task tool (agent delegation)
    if (toolName === 'Task' && input?.subagent_type) {
      return `delegating to ${input.subagent_type}...`;
    }

    // Generic tool usage
    return `using tool: ${toolName}`;
  }

  /**
   * Format Bash command into readable status (delegates to shared formatter)
   */
  private formatBashCommand(command: string): string {
    return formatBashCommand(command, 'executing');
  }

  /**
   * Extract response content from Claude event
   */
  extractResponse(event: ClaudeStreamEvent): string | null {
    if (!event.message) return null;

    // Handle content as array of objects
    if (Array.isArray(event.message.content)) {
      const textParts = event.message.content
        .map(item => item.text)
        .filter(text => this.exists(text))
        .join('');

      return textParts || null;
    }

    // Handle content as string
    if (typeof event.message.content === 'string') {
      return event.message.content;
    }

    return null;
  }
}
