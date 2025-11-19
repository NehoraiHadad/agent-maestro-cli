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
  | 'progress'
  | 'text';

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
 * Enhanced streaming event types for rich rendering
 */
export type EnhancedEventType =
  | 'thinking'
  | 'tool_use'
  | 'tool_result'
  | 'progress'
  | 'text'
  | 'error';

export interface ThinkingEvent {
  type: 'thinking';
  content: string;
  timestamp: number;
}

export interface ToolUseEvent {
  type: 'tool_use';
  toolName: string;
  args: Record<string, unknown>;
  timestamp: number;
}

export interface ToolResultEvent {
  type: 'tool_result';
  toolName: string;
  result?: string;
  isError: boolean;
  timestamp: number;
}

export interface ProgressEvent {
  type: 'progress';
  percentage: number;
  label: string;
  timestamp: number;
}

export interface TextEvent {
  type: 'text';
  content: string;
  timestamp: number;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
  timestamp: number;
}

export type EnhancedStreamEvent =
  | ThinkingEvent
  | ToolUseEvent
  | ToolResultEvent
  | ProgressEvent
  | TextEvent
  | ErrorEvent;

/**
 * Processed stream with extracted events and metadata
 */
export interface ProcessedStream {
  text: string;
  events: EnhancedStreamEvent[];
  metadata: StreamMetadata;
}

export interface StreamMetadata {
  hasThinking: boolean;
  hasToolUse: boolean;
  toolCount: number;
  eventCount: number;
}
