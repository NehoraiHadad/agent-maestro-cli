/**
 * Types for streaming events processing
 */

export type EventType =
  | 'thread.started'
  | 'turn.started'
  | 'turn.completed'
  | 'item.started'
  | 'item.completed'
  | 'assistant'
  | 'system'
  | 'result'
  | 'init'
  | 'message'
  | 'tool_use'
  | 'tool_result'
  | 'user'
  | 'error'
  | 'thinking'
  | 'progress';

export type ItemType =
  | 'reasoning'
  | 'command_execution'
  | 'tool_call'
  | 'agent_message';

export interface BaseStreamEvent {
  type: EventType;
  timestamp?: number;
}

export interface CodexStreamEvent extends BaseStreamEvent {
  thread_id?: string;
  item?: {
    id?: string;
    type: ItemType;
    text?: string;
    name?: string;
    command?: string;
    status?: 'in_progress' | 'completed' | 'failed';
    exit_code?: number;
    aggregated_output?: string;
  };
  usage?: {
    input_tokens?: number;
    cached_input_tokens?: number;
    output_tokens?: number;
  };
}

export interface ClaudeStreamEvent extends BaseStreamEvent {
  subtype?: string;
  message?: {
    role?: string;
    content: string | Array<{
      type?: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
      tool_use_id?: string;
      content?: string;
      is_error?: boolean;
    }>;
  };
}

export interface GeminiStreamEvent extends BaseStreamEvent {
  text?: string;
  response?: string;
  tool?: {
    name: string;
  };
}

export type StreamEvent = CodexStreamEvent | ClaudeStreamEvent | GeminiStreamEvent;

export interface StatusUpdate {
  status: string;
  color?: string;
  timestamp: Date;
}

export interface ParsedResponse {
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Enhanced event types for structured extraction
 */
export interface ThinkingEvent {
  type: 'thinking';
  content: string;
  timestamp: number;
}

export interface ToolUseEvent {
  type: 'tool_use';
  toolName: string;
  input: Record<string, unknown>;
  timestamp: number;
}

export interface ToolResultEvent {
  type: 'tool_result';
  toolName: string;
  output: string;
  isError: boolean;
  timestamp: number;
}

export interface ProgressEvent {
  type: 'progress';
  current: number;
  total: number;
  label: string;
  timestamp: number;
}

export interface TextEvent {
  type: 'text';
  content: string;
  timestamp: number;
}

export type ExtractedEvent =
  | ThinkingEvent
  | ToolUseEvent
  | ToolResultEvent
  | ProgressEvent
  | TextEvent;

/**
 * Processed stream with extracted events and metadata
 */
export interface ProcessedStream {
  text: string;
  events: ExtractedEvent[];
  metadata: StreamMetadata;
}

/**
 * Stream metadata
 */
export interface StreamMetadata {
  hasThinking: boolean;
  hasToolUse: boolean;
  toolsUsed: string[];
  eventCount: number;
}
