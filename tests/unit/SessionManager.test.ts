import { describe, it, expect, beforeEach } from '@jest/globals';
import { SessionManager } from '../../src/features/orchestration/SessionManager.js';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('Message Management', () => {
    it('should add user message', () => {
      const message = sessionManager.addUserMessage('Hello');

      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello');
      expect(sessionManager.getMessages()).toHaveLength(1);
    });

    it('should add assistant message', () => {
      const message = sessionManager.addAssistantMessage('Hi there', 'claude');

      expect(message.role).toBe('assistant');
      expect(message.content).toBe('Hi there');
      expect(message.metadata.agent).toBe('claude');
      expect(sessionManager.getMessages()).toHaveLength(1);
    });

    it('should add delegation message', () => {
      const message = sessionManager.addDelegationMessage('claude', 'gemini', 'Task completed');

      expect(message.role).toBe('delegation');
      expect(message.content).toBe('Task completed');
      expect(message.metadata.delegationFrom).toBe('claude');
      expect(message.metadata.delegationTo).toBe('gemini');
    });

    it('should get all messages', () => {
      sessionManager.addUserMessage('Message 1');
      sessionManager.addAssistantMessage('Message 2', 'claude');
      sessionManager.addUserMessage('Message 3');

      const messages = sessionManager.getMessages();
      expect(messages).toHaveLength(3);
    });

    it('should return copy of messages array', () => {
      sessionManager.addUserMessage('Test');

      const messages1 = sessionManager.getMessages();
      const messages2 = sessionManager.getMessages();

      expect(messages1).not.toBe(messages2);
      expect(messages1).toEqual(messages2);
    });

    it('should get history', () => {
      sessionManager.addUserMessage('Message 1');
      sessionManager.addAssistantMessage('Message 2', 'claude');

      const history = sessionManager.getHistory();
      expect(history).toHaveLength(2);
      expect(history).toEqual(sessionManager.getMessages());
    });
  });

  describe('Session Management', () => {
    it('should clear session', () => {
      sessionManager.addUserMessage('Message 1');
      sessionManager.addAssistantMessage('Message 2', 'claude');

      expect(sessionManager.getMessages()).toHaveLength(2);

      sessionManager.clearSession();

      expect(sessionManager.getMessages()).toHaveLength(0);
    });

    it('should generate new session ID on clear', () => {
      const summary1 = sessionManager.getSummary();
      const sessionId1 = summary1.sessionId;

      sessionManager.clearSession();

      const summary2 = sessionManager.getSummary();
      const sessionId2 = summary2.sessionId;

      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('Session Summary', () => {
    it('should generate accurate summary', () => {
      sessionManager.addUserMessage('User 1');
      sessionManager.addUserMessage('User 2');
      sessionManager.addAssistantMessage('Assistant 1', 'claude');
      sessionManager.addDelegationMessage('claude', 'gemini', 'Done');

      const summary = sessionManager.getSummary();

      expect(summary.messageCount).toBe(4);
      expect(summary.userMessages).toBe(2);
      expect(summary.assistantMessages).toBe(1);
      expect(summary.delegationMessages).toBe(1);
      expect(summary.sessionId).toBeDefined();
      expect(summary.startTime).toBeInstanceOf(Date);
      expect(summary.duration).toBeGreaterThanOrEqual(0);
    });

    it('should track session duration', async () => {
      const summary1 = sessionManager.getSummary();

      await new Promise(resolve => setTimeout(resolve, 10));

      const summary2 = sessionManager.getSummary();

      expect(summary2.duration).toBeGreaterThan(summary1.duration);
    });
  });

  describe('Session Export', () => {
    it('should export session data', () => {
      sessionManager.addUserMessage('Test');

      const exported = sessionManager.export();

      expect(exported).toHaveProperty('sessionId');
      expect(exported).toHaveProperty('startTime');
      expect(exported).toHaveProperty('messages');
      expect(exported).toHaveProperty('summary');
      expect(exported.messages).toHaveLength(1);
    });

    it('should export messages in JSON format', () => {
      sessionManager.addUserMessage('Test message');

      const exported = sessionManager.export();
      const message = exported.messages[0];

      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('role');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('timestamp');
    });
  });

  describe('CLI Session Management', () => {
    it('should get undefined for non-existent CLI session', () => {
      const session = sessionManager.getCliSession('claude');
      expect(session).toBeUndefined();
    });

    it('should set CLI session', () => {
      sessionManager.setCliSession('claude', {
        sessionId: 'test-session',
        isActive: true
      });

      const session = sessionManager.getCliSession('claude');
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe('test-session');
      expect(session?.isActive).toBe(true);
      expect(session?.agentType).toBe('claude');
    });

    it('should activate CLI session', () => {
      sessionManager.activateCliSession('claude', 'session-123');

      const session = sessionManager.getCliSession('claude');
      expect(session?.isActive).toBe(true);
      expect(session?.sessionId).toBe('session-123');
    });

    it('should check if CLI session is active', () => {
      expect(sessionManager.hasActiveCliSession('claude')).toBe(false);

      sessionManager.activateCliSession('claude');
      expect(sessionManager.hasActiveCliSession('claude')).toBe(true);
    });

    it('should clear specific CLI session', () => {
      sessionManager.activateCliSession('claude');
      sessionManager.activateCliSession('gemini');

      expect(sessionManager.hasActiveCliSession('claude')).toBe(true);
      expect(sessionManager.hasActiveCliSession('gemini')).toBe(true);

      sessionManager.clearCliSession('claude');

      expect(sessionManager.hasActiveCliSession('claude')).toBe(false);
      expect(sessionManager.hasActiveCliSession('gemini')).toBe(true);
    });

    it('should clear all CLI sessions', () => {
      sessionManager.activateCliSession('claude');
      sessionManager.activateCliSession('gemini');
      sessionManager.activateCliSession('codex');

      sessionManager.clearAllCliSessions();

      expect(sessionManager.hasActiveCliSession('claude')).toBe(false);
      expect(sessionManager.hasActiveCliSession('gemini')).toBe(false);
      expect(sessionManager.hasActiveCliSession('codex')).toBe(false);
    });

    it('should update existing CLI session', () => {
      sessionManager.setCliSession('claude', {
        sessionId: 'session-1',
        isActive: true
      });

      sessionManager.setCliSession('claude', {
        sessionId: 'session-2'
      });

      const session = sessionManager.getCliSession('claude');
      expect(session?.sessionId).toBe('session-2');
      expect(session?.isActive).toBe(true); // Should preserve from existing
    });
  });

  describe('Delegation Feedback Formatting', () => {
    it('should format empty delegations', () => {
      const formatted = sessionManager.formatDelegationFeedback([]);
      expect(formatted).toBe('');
    });

    it('should format successful delegation', () => {
      const formatted = sessionManager.formatDelegationFeedback([
        {
          agent: 'gemini',
          task: 'Test task',
          result: 'Task completed successfully'
        }
      ]);

      expect(formatted).toContain('Delegation Results');
      expect(formatted).toContain('[Delegated to: gemini]');
      expect(formatted).toContain('Task: Test task');
      expect(formatted).toContain('Status: Completed successfully');
      expect(formatted).toContain('Result: Task completed successfully');
    });

    it('should format failed delegation', () => {
      const formatted = sessionManager.formatDelegationFeedback([
        {
          agent: 'codex',
          task: 'Test task',
          error: 'Something went wrong'
        }
      ]);

      expect(formatted).toContain('Status: Failed');
      expect(formatted).toContain('Error: Something went wrong');
    });

    it('should format pending delegation', () => {
      const formatted = sessionManager.formatDelegationFeedback([
        {
          agent: 'claude',
          task: 'Long running task',
          pending: true
        }
      ]);

      expect(formatted).toContain('Status: Running in background');
    });

    it('should truncate long tasks', () => {
      const longTask = 'a'.repeat(150);
      const formatted = sessionManager.formatDelegationFeedback([
        {
          agent: 'claude',
          task: longTask,
          result: 'Done'
        }
      ]);

      expect(formatted).toContain('...');
    });

    it('should truncate long results', () => {
      const longResult = 'b'.repeat(400);
      const formatted = sessionManager.formatDelegationFeedback([
        {
          agent: 'claude',
          task: 'Short task',
          result: longResult
        }
      ]);

      expect(formatted).toContain('...');
    });

    it('should format multiple delegations', () => {
      const formatted = sessionManager.formatDelegationFeedback([
        { agent: 'claude', task: 'Task 1', result: 'Result 1' },
        { agent: 'gemini', task: 'Task 2', error: 'Error 2' },
        { agent: 'codex', task: 'Task 3', pending: true }
      ]);

      expect(formatted).toContain('[Delegated to: claude]');
      expect(formatted).toContain('[Delegated to: gemini]');
      expect(formatted).toContain('[Delegated to: codex]');
    });
  });
});
