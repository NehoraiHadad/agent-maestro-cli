/**
 * Types for history search and management
 */

import { Message, MessageRole } from '../../domain/entities/Message.js';

/**
 * Search options for full-text search
 */
export interface SearchOptions {
  /** Case-sensitive search */
  caseSensitive?: boolean;

  /** Search in specific message role(s) */
  roles?: MessageRole[];

  /** Search in specific agent(s) */
  agents?: string[];

  /** Search from this date */
  fromDate?: Date;

  /** Search until this date */
  toDate?: Date;

  /** Maximum number of results */
  limit?: number;

  /** Include context (surrounding messages) */
  includeContext?: boolean;

  /** Number of context messages before/after */
  contextSize?: number;
}

/**
 * Filter options for filtering messages
 */
export interface FilterOptions {
  /** Filter by agent name(s) */
  agents?: string[];

  /** Filter by role(s) */
  roles?: MessageRole[];

  /** Filter from this date */
  fromDate?: Date;

  /** Filter until this date */
  toDate?: Date;

  /** Custom filter predicate */
  predicate?: (msg: Message) => boolean;

  /** Maximum number of results */
  limit?: number;
}

/**
 * Export options for exporting history
 */
export interface ExportOptions {
  /** Include message metadata */
  includeMetadata?: boolean;

  /** Include timestamps */
  includeTimestamps?: boolean;

  /** Filter options for export */
  filter?: FilterOptions;

  /** Pretty print for JSON */
  prettyPrint?: boolean;

  /** Include statistics in export */
  includeStats?: boolean;
}

/**
 * History statistics
 */
export interface HistoryStats {
  /** Total number of messages */
  totalMessages: number;

  /** Number of user messages */
  userMessages: number;

  /** Number of assistant messages */
  assistantMessages: number;

  /** Number of delegation messages */
  delegationMessages: number;

  /** Number of system messages */
  systemMessages: number;

  /** Messages by agent */
  messagesByAgent: Record<string, number>;

  /** Average message length */
  averageMessageLength: number;

  /** First message timestamp */
  firstMessage?: Date;

  /** Last message timestamp */
  lastMessage?: Date;

  /** Total conversation duration */
  conversationDuration?: number;
}

/**
 * Search result with context
 */
export interface SearchResult {
  /** Matching message */
  message: Message;

  /** Messages before the match (if context enabled) */
  before?: Message[];

  /** Messages after the match (if context enabled) */
  after?: Message[];

  /** Match score (for fuzzy search) */
  score?: number;
}
