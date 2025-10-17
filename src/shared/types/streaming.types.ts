/**
 * Types for streaming events processing
 */

export type EventType =
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
  | 'error';

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
  item?: {
    type: ItemType;
    text?: string;
    name?: string;
    command?: string;
  };
}

export interface ClaudeStreamEvent extends BaseStreamEvent {
  subtype?: string;
  message?: {
    content: string | Array<{ text?: string }>;
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
