import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConfigManager } from '../../src/features/orchestration/ConfigManager.js';
import { SessionManager } from '../../src/features/orchestration/SessionManager.js';

describe('Orchestration Integration', () => {
  let configManager: ConfigManager;
  let sessionManager: SessionManager;

  beforeEach(() => {
    configManager = new ConfigManager({
      verbose: false,
      showSpinner: false,
      inactivityTimeout: 5000
    });

    sessionManager = new SessionManager();
  });

  describe('Component Integration', () => {
    it('should integrate ConfigManager with SessionManager', () => {
      // Create session
      const userMessage = sessionManager.addUserMessage('Hello');

      // Verify config is valid for session
      expect(configManager.validate().valid).toBe(true);
      expect(sessionManager.getMessages()).toContain(userMessage);
    });

    it('should handle session lifecycle with configuration', () => {
      // Add messages
      sessionManager.addUserMessage('Message 1');
      sessionManager.addAssistantMessage('Response 1', 'claude');

      const summary1 = sessionManager.getSummary();
      expect(summary1.messageCount).toBe(2);

      // Clear session
      sessionManager.clearSession();

      const summary2 = sessionManager.getSummary();
      expect(summary2.messageCount).toBe(0);
      expect(summary2.sessionId).not.toBe(summary1.sessionId);
    });
  });

  describe('Session and Message Management', () => {
    it('should track complete conversation flow', () => {
      // Simulate a conversation
      const msg1 = sessionManager.addUserMessage('What is the weather?');
      const msg2 = sessionManager.addAssistantMessage('It is sunny', 'claude');
      const msg3 = sessionManager.addUserMessage('Thanks!');

      const messages = sessionManager.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0]).toBe(msg1);
      expect(messages[1]).toBe(msg2);
      expect(messages[2]).toBe(msg3);

      const summary = sessionManager.getSummary();
      expect(summary.userMessages).toBe(2);
      expect(summary.assistantMessages).toBe(1);
    });

    it('should handle delegation flow', () => {
      sessionManager.addUserMessage('Complex task');
      sessionManager.addAssistantMessage('Delegating to specialist', 'claude');
      sessionManager.addDelegationMessage('claude', 'gemini', 'Task completed');
      sessionManager.addAssistantMessage('Here are the results', 'claude');

      const summary = sessionManager.getSummary();
      expect(summary.messageCount).toBe(4);
      expect(summary.delegationMessages).toBe(1);
    });

    it('should export complete session data', () => {
      sessionManager.addUserMessage('Test message 1');
      sessionManager.addAssistantMessage('Test response 1', 'claude');
      sessionManager.addDelegationMessage('claude', 'gemini', 'Delegated work');

      const exported = sessionManager.export();

      expect(exported.sessionId).toBeDefined();
      expect(exported.startTime).toBeInstanceOf(Date);
      expect(exported.messages).toHaveLength(3);
      expect(exported.summary.messageCount).toBe(3);
      expect(exported.summary.delegationMessages).toBe(1);
    });
  });

  describe('CLI Session Management', () => {
    it('should manage multiple agent sessions', () => {
      sessionManager.activateCliSession('claude', 'session-claude-123');
      sessionManager.activateCliSession('gemini', 'session-gemini-456');

      expect(sessionManager.hasActiveCliSession('claude')).toBe(true);
      expect(sessionManager.hasActiveCliSession('gemini')).toBe(true);

      const claudeSession = sessionManager.getCliSession('claude');
      const geminiSession = sessionManager.getCliSession('gemini');

      expect(claudeSession?.sessionId).toBe('session-claude-123');
      expect(geminiSession?.sessionId).toBe('session-gemini-456');
    });

    it('should clear individual agent sessions', () => {
      sessionManager.activateCliSession('claude');
      sessionManager.activateCliSession('gemini');

      sessionManager.clearCliSession('claude');

      expect(sessionManager.hasActiveCliSession('claude')).toBe(false);
      expect(sessionManager.hasActiveCliSession('gemini')).toBe(true);
    });

    it('should handle session continuity', () => {
      // First interaction
      sessionManager.activateCliSession('claude', 'persistent-session');
      sessionManager.addUserMessage('First message');
      sessionManager.addAssistantMessage('First response', 'claude');

      // Get session ID
      const session1 = sessionManager.getCliSession('claude');
      const sessionId = session1?.sessionId;

      // Continue session
      sessionManager.activateCliSession('claude', sessionId);
      sessionManager.addUserMessage('Follow-up message');

      const messages = sessionManager.getMessages();
      expect(messages).toHaveLength(3);
    });
  });

  describe('Configuration Validation in Workflow', () => {
    it('should validate configuration before operations', () => {
      const validation = configManager.validate();
      expect(validation.valid).toBe(true);

      // Perform operations with valid config
      sessionManager.addUserMessage('Test');
      expect(sessionManager.getMessages()).toHaveLength(1);
    });

    it('should reject invalid configuration', () => {
      expect(() => {
        new ConfigManager({ inactivityTimeout: -1 });
      }).toThrow();
    });

    it('should allow configuration updates', () => {
      expect(configManager.get('verbose')).toBe(false);

      configManager.set('verbose', true);
      expect(configManager.get('verbose')).toBe(true);
    });
  });
});
