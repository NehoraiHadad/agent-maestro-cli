/**
 * SessionManager.ts
 * Manages conversation session and message history
 */

import { Message } from '../../domain/entities/index.js';

/**
 * CLI session state for a specific agent
 */
export interface CliSessionState {
  sessionId?: string;      // Session ID from CLI (e.g., UUID for codex)
  isActive: boolean;        // Whether this session is currently active
  lastInteraction: Date;    // Last time this session was used
  agentType: string;        // Type of agent (claude, codex, gemini)
}

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
  private cliSessions: Map<string, CliSessionState> = new Map();

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
   * Format delegation results as a system message for agent context
   * This allows the main agent to see what delegated agents accomplished
   * @param delegations - Array of delegation results
   * @returns Formatted string for injection into agent context
   */
  formatDelegationFeedback(delegations: Array<{
    agent: string;
    task: string;
    result?: string;
    error?: string;
    pending?: boolean;
  }>): string {
    if (delegations.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push('\n--- Delegation Results ---');

    for (const delegation of delegations) {
      lines.push(`\n[Delegated to: ${delegation.agent}]`);
      lines.push(`Task: ${delegation.task.substring(0, 100)}${delegation.task.length > 100 ? '...' : ''}`);

      if (delegation.pending) {
        lines.push('Status: Running in background');
      } else if (delegation.result) {
        lines.push('Status: Completed successfully');
        lines.push(`Result: ${delegation.result.substring(0, 300)}${delegation.result.length > 300 ? '...' : ''}`);
      } else if (delegation.error) {
        lines.push('Status: Failed');
        lines.push(`Error: ${delegation.error}`);
      }
    }

    lines.push('\n--- End Delegation Results ---\n');

    return lines.join('\n');
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
    this.clearAllCliSessions();
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
   * Get CLI session state for a specific agent type
   * @param agentType - Type of agent (claude, codex, gemini, maestro)
   * @returns CLI session state or undefined if not active
   */
  getCliSession(agentType: string): CliSessionState | undefined {
    return this.cliSessions.get(agentType);
  }

  /**
   * Set or update CLI session state for a specific agent
   * @param agentType - Type of agent
   * @param sessionState - Session state to set
   */
  setCliSession(agentType: string, sessionState: Partial<CliSessionState>): void {
    const existing = this.cliSessions.get(agentType);

    this.cliSessions.set(agentType, {
      agentType,
      isActive: sessionState.isActive ?? existing?.isActive ?? true,
      lastInteraction: sessionState.lastInteraction ?? new Date(),
      sessionId: sessionState.sessionId ?? existing?.sessionId
    });
  }

  /**
   * Mark a CLI session as active (for continuation)
   * @param agentType - Type of agent
   * @param sessionId - Optional session ID from CLI
   */
  activateCliSession(agentType: string, sessionId?: string): void {
    this.setCliSession(agentType, {
      isActive: true,
      sessionId,
      lastInteraction: new Date()
    });
  }

  /**
   * Clear CLI session for a specific agent
   * @param agentType - Type of agent
   */
  clearCliSession(agentType: string): void {
    this.cliSessions.delete(agentType);
  }

  /**
   * Check if an agent has an active CLI session
   * @param agentType - Type of agent
   * @returns True if session is active
   */
  hasActiveCliSession(agentType: string): boolean {
    const session = this.cliSessions.get(agentType);
    return session?.isActive ?? false;
  }

  /**
   * Clear all CLI sessions
   */
  clearAllCliSessions(): void {
    this.cliSessions.clear();
  }

  /**
   * Generate a unique session ID
   * @returns Unique session identifier
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
