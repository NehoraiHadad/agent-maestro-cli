/**
 * Parser for Codex JSONL streaming events
 * Handles OpenAI Codex specific event formats and command execution status
 */

import { BaseParser } from './BaseParser.js';
import type { CodexStreamEvent, StatusUpdate } from '../../../shared/types/index.js';
import { truncate, getFilename } from '../../../shared/utils/index.js';

/**
 * Codex-specific streaming event parser
 */
export class CodexParser extends BaseParser {
  /**
   * Parse Codex streaming event into status update
   */
  parseEvent(event: CodexStreamEvent): StatusUpdate | null {
    const status = this.extractStatus(event);
    if (!status) return null;

    return this.createStatusUpdate(status, 'cyan');
  }

  /**
   * Extract status message from Codex event
   */
  extractStatus(event: CodexStreamEvent): string | null {
    // Turn started
    if (this.hasType(event, 'turn.started')) {
      return 'starting...';
    }

    // Turn completed
    if (this.hasType(event, 'turn.completed')) {
      return 'completed';
    }

    // Item started - check for command execution
    if (this.hasType(event, 'item.started') && event.item) {
      if (event.item.type === 'command_execution' && event.item.command) {
        return this.extractCommandInfo(event.item.command);
      }
    }

    // Item completed - check for different types
    if (this.hasType(event, 'item.completed') && event.item) {
      const { type, text, name } = event.item;

      if (type === 'reasoning' && text) {
        return `thinking: ${truncate(text, 50)}`;
      }

      if (type === 'tool_call' && name) {
        return `using tool: ${name}`;
      }
    }

    return null;
  }

  /**
   * Extract response content from Codex event
   */
  extractResponse(event: CodexStreamEvent): string | null {
    if (this.hasType(event, 'item.completed') && event.item) {
      if (event.item.type === 'agent_message' && event.item.text) {
        return event.item.text;
      }
    }
    return null;
  }

  /**
   * Extract command information and format status message
   */
  private extractCommandInfo(command: string): string {
    const fileOp = this.parseFileOperation(command);
    if (fileOp) return fileOp;

    // Search operations
    if (this.isSearchCommand(command)) {
      return 'searching files...';
    }

    // Edit operations
    if (this.isEditCommand(command)) {
      return 'editing file...';
    }

    // Generic command execution
    const cmdName = command.split(' ')[0];
    return `executing: ${cmdName}`;
  }

  /**
   * Parse file operations and extract filename
   */
  private parseFileOperation(command: string): string | null {
    const readCommands = ['sed', 'cat', 'head', 'tail'];
    const cmdParts = command.split(' ');
    const cmdName = cmdParts[0];

    if (readCommands.includes(cmdName)) {
      // Find the file argument (usually last non-flag argument)
      const fileArg = cmdParts.find(part =>
        !part.startsWith('-') && part !== cmdName
      );

      if (fileArg) {
        const filename = getFilename(fileArg);
        return `reading: ${filename}`;
      }
    }

    return null;
  }

  /**
   * Check if command is a search operation
   */
  private isSearchCommand(command: string): boolean {
    const searchCommands = ['grep', 'find', 'ls', 'rg', 'fd'];
    const cmdName = command.split(' ')[0];
    return searchCommands.includes(cmdName);
  }

  /**
   * Check if command is an edit operation
   */
  private isEditCommand(command: string): boolean {
    const editCommands = ['vim', 'nano', 'edit', 'vi', 'emacs'];
    const cmdName = command.split(' ')[0];
    return editCommands.includes(cmdName);
  }
}
