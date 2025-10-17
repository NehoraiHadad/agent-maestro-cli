/**
 * Conversation Manager - Manages conversation history and state
 */

export class ConversationManager {
  constructor(primaryAgent) {
    this.primaryAgent = primaryAgent;
    this.history = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `maestro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add user message to history
   */
  addUserMessage(message) {
    const entry = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    this.history.push(entry);
    return entry;
  }

  /**
   * Add assistant message to history
   */
  addAssistantMessage(message, agent = null) {
    const entry = {
      role: 'assistant',
      agent: agent || this.primaryAgent,
      content: message,
      timestamp: Date.now()
    };
    this.history.push(entry);
    return entry;
  }

  /**
   * Add delegation event to history
   */
  addDelegationEvent(fromAgent, toAgent, prompt, result) {
    const entry = {
      role: 'delegation',
      fromAgent,
      toAgent,
      prompt,
      result,
      timestamp: Date.now()
    };
    this.history.push(entry);
    return entry;
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.history;
  }

  /**
   * Get last N messages
   */
  getLastMessages(n = 10) {
    return this.history.slice(-n);
  }

  /**
   * Get conversation summary
   */
  getSummary() {
    const userMessages = this.history.filter(m => m.role === 'user').length;
    const assistantMessages = this.history.filter(m => m.role === 'assistant').length;
    const delegations = this.history.filter(m => m.role === 'delegation').length;

    return {
      sessionId: this.sessionId,
      primaryAgent: this.primaryAgent,
      totalMessages: this.history.length,
      userMessages,
      assistantMessages,
      delegations,
      duration: Date.now() - this.startTime
    };
  }

  /**
   * Clear history
   */
  clear() {
    this.history = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  /**
   * Export conversation to JSON
   */
  export() {
    return {
      ...this.getSummary(),
      history: this.history
    };
  }

  /**
   * Save conversation to file
   */
  async saveToFile(filePath) {
    const fs = await import('fs/promises');
    const data = JSON.stringify(this.export(), null, 2);
    await fs.writeFile(filePath, data, 'utf8');
    return filePath;
  }

  /**
   * Load conversation from file
   */
  async loadFromFile(filePath) {
    const fs = await import('fs/promises');
    const data = await fs.readFile(filePath, 'utf8');
    const conversation = JSON.parse(data);

    this.sessionId = conversation.sessionId;
    this.primaryAgent = conversation.primaryAgent;
    this.history = conversation.history;
    this.startTime = Date.now() - conversation.duration;

    return conversation;
  }
}

export default ConversationManager;
