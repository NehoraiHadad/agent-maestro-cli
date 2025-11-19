/**
 * HistoryManager - Manages conversation history search, filtering, and export
 */

import { Message, MessageRole } from '../../domain/entities/Message.js';
import {
  SearchOptions,
  FilterOptions,
  ExportOptions,
  HistoryStats,
  SearchResult
} from './types.js';

/**
 * History manager for searching, filtering, and exporting message history
 */
export class HistoryManager {
  private messages: Message[];

  constructor(messages: Message[]) {
    this.messages = messages;
  }

  /**
   * Full-text search in message history
   * @param query - Search query string
   * @param options - Search options
   * @returns Array of matching messages or search results with context
   */
  search(query: string, options: SearchOptions = {}): Message[] | SearchResult[] {
    const {
      caseSensitive = false,
      roles,
      agents,
      fromDate,
      toDate,
      limit,
      includeContext = false,
      contextSize = 2
    } = options;

    // Prepare search query
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    // Filter and search messages
    let results = this.messages.filter(msg => {
      // Check date range
      if (fromDate && msg.timestamp < fromDate) return false;
      if (toDate && msg.timestamp > toDate) return false;

      // Check role filter
      if (roles && !roles.includes(msg.role)) return false;

      // Check agent filter
      if (agents) {
        const msgAgent = msg.metadata.agent as string | undefined;
        if (!msgAgent || !agents.includes(msgAgent)) return false;
      }

      // Check if content matches query
      const content = caseSensitive ? msg.content : msg.content.toLowerCase();
      return content.includes(searchQuery);
    });

    // Apply limit
    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }

    // Return with context if requested
    if (includeContext) {
      return results.map(msg => this.getMessageWithContext(msg, contextSize));
    }

    return results;
  }

  /**
   * Filter messages based on predicate or options
   * @param predicateOrOptions - Filter predicate function or filter options
   * @returns Filtered messages
   */
  filter(
    predicateOrOptions: ((msg: Message) => boolean) | FilterOptions
  ): Message[] {
    // Handle function predicate
    if (typeof predicateOrOptions === 'function') {
      return this.messages.filter(predicateOrOptions);
    }

    // Handle options object
    const options = predicateOrOptions;
    const {
      agents,
      roles,
      fromDate,
      toDate,
      predicate,
      limit
    } = options;

    let results = this.messages.filter(msg => {
      // Check date range
      if (fromDate && msg.timestamp < fromDate) return false;
      if (toDate && msg.timestamp > toDate) return false;

      // Check role filter
      if (roles && !roles.includes(msg.role)) return false;

      // Check agent filter
      if (agents) {
        const msgAgent = msg.metadata.agent as string | undefined;
        if (!msgAgent || !agents.includes(msgAgent)) return false;
      }

      // Check custom predicate
      if (predicate && !predicate(msg)) return false;

      return true;
    });

    // Apply limit
    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Export history to specified format
   * @param format - Export format (json, md, txt)
   * @param options - Export options
   * @returns Formatted string
   */
  export(
    format: 'json' | 'md' | 'txt',
    options: ExportOptions = {}
  ): string {
    const {
      includeMetadata = true,
      includeTimestamps = true,
      filter,
      prettyPrint = true,
      includeStats = false
    } = options;

    // Get messages to export (apply filter if provided)
    let messagesToExport = this.messages;
    if (filter) {
      messagesToExport = this.filter(filter);
    }

    // Export based on format
    switch (format) {
      case 'json':
        return this.exportToJson(
          messagesToExport,
          includeMetadata,
          prettyPrint,
          includeStats
        );

      case 'md':
        return this.exportToMarkdown(
          messagesToExport,
          includeMetadata,
          includeTimestamps,
          includeStats
        );

      case 'txt':
        return this.exportToText(
          messagesToExport,
          includeTimestamps,
          includeStats
        );

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get history statistics
   * @returns History statistics
   */
  getStats(): HistoryStats {
    const totalMessages = this.messages.length;
    const userMessages = this.messages.filter(m => m.role === 'user').length;
    const assistantMessages = this.messages.filter(m => m.role === 'assistant').length;
    const delegationMessages = this.messages.filter(m => m.role === 'delegation').length;
    const systemMessages = this.messages.filter(m => m.role === 'system').length;

    // Count messages by agent
    const messagesByAgent: Record<string, number> = {};
    for (const msg of this.messages) {
      const agent = msg.metadata.agent as string | undefined;
      if (agent) {
        messagesByAgent[agent] = (messagesByAgent[agent] || 0) + 1;
      }
    }

    // Calculate average message length
    const totalLength = this.messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const averageMessageLength = totalMessages > 0 ? Math.round(totalLength / totalMessages) : 0;

    // Get first and last message timestamps
    const firstMessage = this.messages.length > 0 ? this.messages[0].timestamp : undefined;
    const lastMessage = this.messages.length > 0
      ? this.messages[this.messages.length - 1].timestamp
      : undefined;

    // Calculate conversation duration
    const conversationDuration = firstMessage && lastMessage
      ? lastMessage.getTime() - firstMessage.getTime()
      : undefined;

    return {
      totalMessages,
      userMessages,
      assistantMessages,
      delegationMessages,
      systemMessages,
      messagesByAgent,
      averageMessageLength,
      firstMessage,
      lastMessage,
      conversationDuration
    };
  }

  /**
   * Get message with surrounding context
   * @param message - Target message
   * @param contextSize - Number of messages before/after
   * @returns Search result with context
   */
  private getMessageWithContext(message: Message, contextSize: number): SearchResult {
    const index = this.messages.findIndex(m => m.id === message.id);

    if (index === -1) {
      return { message };
    }

    const before = this.messages.slice(
      Math.max(0, index - contextSize),
      index
    );

    const after = this.messages.slice(
      index + 1,
      Math.min(this.messages.length, index + 1 + contextSize)
    );

    return {
      message,
      before: before.length > 0 ? before : undefined,
      after: after.length > 0 ? after : undefined
    };
  }

  /**
   * Export to JSON format
   */
  private exportToJson(
    messages: Message[],
    includeMetadata: boolean,
    prettyPrint: boolean,
    includeStats: boolean
  ): string {
    const data: Record<string, unknown> = {
      messages: messages.map(m => {
        const json = m.toJSON();
        if (!includeMetadata) {
          delete json.metadata;
        }
        return json;
      })
    };

    if (includeStats) {
      data.stats = this.getStats();
    }

    return JSON.stringify(data, null, prettyPrint ? 2 : 0);
  }

  /**
   * Export to Markdown format
   */
  private exportToMarkdown(
    messages: Message[],
    includeMetadata: boolean,
    includeTimestamps: boolean,
    includeStats: boolean
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('# Conversation History');
    lines.push('');

    // Stats if requested
    if (includeStats) {
      const stats = this.getStats();
      lines.push('## Statistics');
      lines.push('');
      lines.push(`- **Total Messages:** ${stats.totalMessages}`);
      lines.push(`- **User Messages:** ${stats.userMessages}`);
      lines.push(`- **Assistant Messages:** ${stats.assistantMessages}`);
      lines.push(`- **Delegation Messages:** ${stats.delegationMessages}`);
      lines.push(`- **Average Message Length:** ${stats.averageMessageLength} chars`);

      if (stats.firstMessage && stats.lastMessage) {
        lines.push(`- **First Message:** ${stats.firstMessage.toLocaleString()}`);
        lines.push(`- **Last Message:** ${stats.lastMessage.toLocaleString()}`);
      }

      if (stats.conversationDuration) {
        const durationMin = Math.floor(stats.conversationDuration / 60000);
        const durationSec = Math.floor((stats.conversationDuration % 60000) / 1000);
        lines.push(`- **Duration:** ${durationMin}m ${durationSec}s`);
      }

      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Messages
    lines.push('## Messages');
    lines.push('');

    for (const msg of messages) {
      const roleLabel = this.formatRole(msg.role);
      const agent = msg.metadata.agent ? ` (${String(msg.metadata.agent)})` : '';
      const timestamp = includeTimestamps
        ? ` - ${msg.timestamp.toLocaleString()}`
        : '';

      lines.push(`### ${roleLabel}${agent}${timestamp}`);
      lines.push('');

      if (includeMetadata && Object.keys(msg.metadata).length > 0) {
        const filteredMetadata = { ...msg.metadata };
        delete filteredMetadata.timestamp;
        if (Object.keys(filteredMetadata).length > 0) {
          lines.push('```json');
          lines.push(JSON.stringify(filteredMetadata, null, 2));
          lines.push('```');
          lines.push('');
        }
      }

      lines.push(msg.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export to plain text format
   */
  private exportToText(
    messages: Message[],
    includeTimestamps: boolean,
    includeStats: boolean
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('='.repeat(60));
    lines.push('Conversation History');
    lines.push('='.repeat(60));
    lines.push('');

    // Stats if requested
    if (includeStats) {
      const stats = this.getStats();
      lines.push('STATISTICS:');
      lines.push('-'.repeat(60));
      lines.push(`Total Messages: ${stats.totalMessages}`);
      lines.push(`User Messages: ${stats.userMessages}`);
      lines.push(`Assistant Messages: ${stats.assistantMessages}`);
      lines.push(`Delegation Messages: ${stats.delegationMessages}`);
      lines.push(`Average Message Length: ${stats.averageMessageLength} chars`);

      if (stats.firstMessage && stats.lastMessage) {
        lines.push(`First Message: ${stats.firstMessage.toLocaleString()}`);
        lines.push(`Last Message: ${stats.lastMessage.toLocaleString()}`);
      }

      if (stats.conversationDuration) {
        const durationMin = Math.floor(stats.conversationDuration / 60000);
        const durationSec = Math.floor((stats.conversationDuration % 60000) / 1000);
        lines.push(`Duration: ${durationMin}m ${durationSec}s`);
      }

      lines.push('');
      lines.push('='.repeat(60));
      lines.push('');
    }

    // Messages
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const roleLabel = this.formatRole(msg.role);
      const agent = msg.metadata.agent ? ` (${String(msg.metadata.agent)})` : '';
      const timestamp = includeTimestamps
        ? ` - ${msg.timestamp.toLocaleString()}`
        : '';

      lines.push(`[${i + 1}] ${roleLabel}${agent}${timestamp}`);
      lines.push('-'.repeat(60));
      lines.push(msg.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format message role for display
   */
  private formatRole(role: MessageRole): string {
    switch (role) {
      case 'user':
        return 'User';
      case 'assistant':
        return 'Assistant';
      case 'delegation':
        return 'Delegation';
      case 'system':
        return 'System';
      default:
        return role;
    }
  }
}
