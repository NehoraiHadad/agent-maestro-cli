/**
 * Message entity - represents a conversation message
 */

export type MessageRole = 'user' | 'assistant' | 'system' | 'delegation';

export interface MessageMetadata {
  agent?: string;
  delegationFrom?: string;
  delegationTo?: string;
  timestamp?: Date;
  [key: string]: unknown;
}

export class Message {
  readonly id: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly metadata: MessageMetadata;
  readonly timestamp: Date;

  constructor(
    role: MessageRole,
    content: string,
    metadata: MessageMetadata = {}
  ) {
    this.id = this.generateId();
    this.role = role;
    this.content = content;
    this.metadata = {
      ...metadata,
      timestamp: metadata.timestamp || new Date()
    };
    this.timestamp = this.metadata.timestamp as Date;
  }

  /**
   * Generate unique message ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if message is from user
   */
  isUserMessage(): boolean {
    return this.role === 'user';
  }

  /**
   * Check if message is from assistant
   */
  isAssistantMessage(): boolean {
    return this.role === 'assistant';
  }

  /**
   * Check if message is a delegation
   */
  isDelegationMessage(): boolean {
    return this.role === 'delegation';
  }

  /**
   * Get formatted timestamp
   */
  getFormattedTimestamp(): string {
    return this.timestamp.toISOString();
  }

  /**
   * Create JSON representation
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
      metadata: this.metadata,
      timestamp: this.getFormattedTimestamp()
    };
  }

  /**
   * Create a copy with updated content
   */
  withContent(newContent: string): Message {
    return new Message(this.role, newContent, this.metadata);
  }

  /**
   * Create a copy with additional metadata
   */
  withMetadata(additionalMetadata: MessageMetadata): Message {
    return new Message(this.role, this.content, {
      ...this.metadata,
      ...additionalMetadata
    });
  }
}
