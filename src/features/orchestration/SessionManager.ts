/**
 * SessionManager.ts
 * Manages conversation session and message history
 */

import { Message } from '../../domain/entities/index.js';

export interface SessionSummary {
  sessionId: string;
  startTime: Date;
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  delegationMessages: number;
  duration: number; // in milliseconds
}

export interface SessionExport {
  sessionId: string;
  startTime: Date;
  messages: ReturnType<Message['toJSON']>[];
  summary: SessionSummary;
}

/**
 * Manages conversation session and message tracking
 */
export class SessionManager {
  private messages: Message[] = [];
  private sessionId: string;
  private startTime: Date;

  /**
   * Create a new SessionManager
   */
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
  }

  /**
   * Add a user message to the session
   * @param content - Message content
   * @returns Created message
   */
  addUserMessage(content: string): Message {
    const message = new Message('user', content);
    this.messages.push(message);
    return message;
  }

  /**
   * Add an assistant message to the session
   * @param content - Message content
   * @param agentName - Name of the agent
   * @returns Created message
   */
  addAssistantMessage(content: string, agentName: string): Message {
    const message = new Message('assistant', content, { agent: agentName });
    this.messages.push(message);
    return message;
  }

  /**
   * Add a delegation message to the session
   * @param from - Delegating agent name
   * @param to - Target agent name
   * @param result - Delegation result
   * @returns Created message
   */
  addDelegationMessage(from: string, to: string, result: string): Message {
    const message = new Message('delegation', result, {
      delegationFrom: from,
      delegationTo: to
    });
    this.messages.push(message);
    return message;
  }

  /**
   * Get all messages in the session
   * @returns Array of messages
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Get message history (all messages)
   * @returns Array of messages
   */
  getHistory(): Message[] {
    return this.getMessages();
  }

  /**
   * Clear all messages from the session
   */
  clearSession(): void {
    this.messages = [];
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
  }

  /**
   * Get session summary
   * @returns Session summary with statistics
   */
  getSummary(): SessionSummary {
    const userMessages = this.messages.filter(m => m.isUserMessage()).length;
    const assistantMessages = this.messages.filter(m => m.isAssistantMessage()).length;
    const delegationMessages = this.messages.filter(m => m.isDelegationMessage()).length;
    const duration = Date.now() - this.startTime.getTime();

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      messageCount: this.messages.length,
      userMessages,
      assistantMessages,
      delegationMessages,
      duration
    };
  }

  /**
   * Export session data
   * @returns Complete session export with all messages
   */
  export(): SessionExport {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      messages: this.messages.map(m => m.toJSON()),
      summary: this.getSummary()
    };
  }

  /**
   * Generate a unique session ID
   * @returns Unique session identifier
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
