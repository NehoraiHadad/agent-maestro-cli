/**
 * Parser for Codex JSONL streaming events
 * Handles OpenAI Codex specific event formats and command execution status
 */

import { BaseParser } from './BaseParser.js';
import type { CodexStreamEvent, StatusUpdate } from '../../../shared/types/index.js';
import { truncate, getFilename } from '../../../shared/utils/index.js';
import {
  stripBashWrapper,
  formatBashCommand,
  isSearchCommand,
  isEditCommand
} from './CommandFormatter.js';

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
    // Thread started
    if (this.hasType(event, 'thread.started')) {
      return 'starting new session...';
    }

    // Turn started
    if (this.hasType(event, 'turn.started')) {
      return 'processing...';
    }

    // Turn completed
    if (this.hasType(event, 'turn.completed')) {
      return 'completed';
    }

    // Item started - check for command execution
    if (this.hasType(event, 'item.started') && event.item) {
      if (event.item.type === 'command_execution' && event.item.command) {
        return this.extractCommandInfo(event.item.command, true);
      }
    }

    // Item completed - check for different types
    if (this.hasType(event, 'item.completed') && event.item) {
      const { type, text, name, exit_code, status } = event.item;

      // Command execution completed
      if (type === 'command_execution') {
        return this.formatCommandCompletion(event.item.command, exit_code, status);
      }

      // Reasoning
      if (type === 'reasoning' && text) {
        // Remove markdown bold markers and truncate
        const cleanText = text.replace(/\*\*/g, '').trim();
        return `thinking: ${truncate(cleanText, 70)}`;
      }

      // Tool call
      if (type === 'tool_call' && name) {
        return this.formatToolCall(name);
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
  private extractCommandInfo(command: string, isStarting: boolean = false): string {
    const cleanCommand = stripBashWrapper(command);

    const fileOp = this.parseFileOperation(cleanCommand);
    if (fileOp) return fileOp;

    // Search operations
    if (isSearchCommand(cleanCommand)) {
      return isStarting ? 'searching files...' : 'search complete';
    }

    // Edit operations
    if (isEditCommand(cleanCommand)) {
      return isStarting ? 'editing file...' : 'edit complete';
    }

    // Use shared formatter for other commands
    if (isStarting) {
      return formatBashCommand(cleanCommand, 'executing');
    }

    // Completion status
    const cmdName = cleanCommand.split(' ')[0];
    return `${cmdName} complete`;
  }

  /**
   * Format command completion status
   */
  private formatCommandCompletion(
    command: string | undefined,
    exitCode: number | undefined,
    status: string | undefined
  ): string {
    // Handle failed commands
    if (status === 'failed' || (exitCode !== undefined && exitCode !== 0)) {
      return `command failed (exit ${exitCode ?? 'unknown'})`;
    }

    // Handle successful completion
    if (!command) {
      return 'command completed';
    }

    const cleanCommand = stripBashWrapper(command);
    const cmdName = cleanCommand.split(' ')[0];
    return `${cmdName} completed`;
  }

  /**
   * Format tool call status
   */
  private formatToolCall(toolName: string): string {
    // Add specific formatting for known tools
    const toolMap: Record<string, string> = {
      'read_file': 'read file',
      'write_file': 'wrote file',
      'search_files': 'searched files',
      'list_directory': 'listed directory',
    };

    return toolMap[toolName] || `used tool: ${toolName}`;
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

}
