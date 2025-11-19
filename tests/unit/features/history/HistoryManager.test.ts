import { describe, it, expect, beforeEach } from '@jest/globals';
import { HistoryManager } from '../../../../src/features/history/HistoryManager.js';
import { Message } from '../../../../src/domain/entities/Message.js';
import type { SearchResult } from '../../../../src/features/history/types.js';

describe('HistoryManager', () => {
  let messages: Message[];
  let historyManager: HistoryManager;

  beforeEach(() => {
    // Create test messages
    const now = new Date('2025-01-15T10:00:00Z');

    messages = [
      new Message('user', 'Hello, I need help with authentication', {
        timestamp: new Date(now.getTime())
      }),
      new Message('assistant', 'I can help you with authentication. What specific issue are you facing?', {
        agent: 'claude',
        timestamp: new Date(now.getTime() + 1000)
      }),
      new Message('user', 'I want to implement JWT authentication', {
        timestamp: new Date(now.getTime() + 2000)
      }),
      new Message('assistant', 'Here is how to implement JWT authentication in Node.js...', {
        agent: 'claude',
        timestamp: new Date(now.getTime() + 3000)
      }),
      new Message('delegation', 'Delegation result for testing', {
        delegationFrom: 'claude',
        delegationTo: 'specialist',
        timestamp: new Date(now.getTime() + 4000)
      }),
      new Message('user', 'How do I handle token refresh?', {
        timestamp: new Date(now.getTime() + 5000)
      }),
      new Message('assistant', 'Token refresh can be handled by...', {
        agent: 'claude',
        timestamp: new Date(now.getTime() + 6000)
      })
    ];

    historyManager = new HistoryManager(messages);
  });

  describe('search', () => {
    it('should find messages containing search query', () => {
      const results = historyManager.search('authentication') as Message[];

      expect(results).toHaveLength(4);
      expect(results[0].content).toContain('authentication');
      expect(results[1].content).toContain('authentication');
      expect(results[2].content).toContain('authentication');
      expect(results[3].content).toContain('authentication');
    });

    it('should perform case-insensitive search by default', () => {
      const results = historyManager.search('AUTHENTICATION') as Message[];

      expect(results).toHaveLength(4);
    });

    it('should perform case-sensitive search when specified', () => {
      const results = historyManager.search('AUTHENTICATION', {
        caseSensitive: true
      }) as Message[];

      expect(results).toHaveLength(0);
    });

    it('should filter by role', () => {
      const results = historyManager.search('authentication', {
        roles: ['user']
      }) as Message[];

      expect(results).toHaveLength(2);
      expect(results.every(m => m.role === 'user')).toBe(true);
    });

    it('should filter by agent', () => {
      const results = historyManager.search('can', {
        agents: ['claude']
      }) as Message[];

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(m => m.metadata.agent === 'claude')).toBe(true);
    });

    it('should filter by date range', () => {
      const fromDate = new Date('2025-01-15T10:00:03Z');
      const toDate = new Date('2025-01-15T10:00:06Z');

      const results = historyManager.search('', {
        fromDate,
        toDate
      }) as Message[];

      expect(results.length).toBeGreaterThan(0);
      results.forEach(msg => {
        expect(msg.timestamp.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
        expect(msg.timestamp.getTime()).toBeLessThanOrEqual(toDate.getTime());
      });
    });

    it('should limit results', () => {
      const results = historyManager.search('', {
        limit: 3
      }) as Message[];

      expect(results).toHaveLength(3);
    });

    it('should include context when requested', () => {
      const results = historyManager.search('JWT', {
        includeContext: true,
        contextSize: 1
      }) as SearchResult[];

      expect(results).toHaveLength(2); // JWT appears in both user message and assistant response
      const result = results[0];

      expect(result.message).toBeDefined();
      expect(result.message.content).toContain('JWT');
      expect(result.before).toBeDefined();
      expect(result.before?.length).toBe(1);
      expect(result.after).toBeDefined();
      expect(result.after?.length).toBe(1);
    });

    it('should handle context at boundaries', () => {
      const results = historyManager.search('Hello', {
        includeContext: true,
        contextSize: 2
      }) as SearchResult[];

      expect(results).toHaveLength(1);
      const result = results[0];

      expect(result.before).toBeUndefined(); // First message has no before
      expect(result.after).toBeDefined();
    });

    it('should return empty array when no matches found', () => {
      const results = historyManager.search('nonexistent query') as Message[];

      expect(results).toHaveLength(0);
    });
  });

  describe('filter', () => {
    it('should filter by custom predicate function', () => {
      const results = historyManager.filter((msg) =>
        msg.content.length > 50
      );

      expect(results.length).toBeGreaterThan(0);
      results.forEach(msg => {
        expect(msg.content.length).toBeGreaterThan(50);
      });
    });

    it('should filter by agent using options', () => {
      const results = historyManager.filter({
        agents: ['claude']
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(msg => {
        expect(msg.metadata.agent).toBe('claude');
      });
    });

    it('should filter by roles using options', () => {
      const results = historyManager.filter({
        roles: ['user']
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(msg => {
        expect(msg.role).toBe('user');
      });
    });

    it('should filter by multiple roles', () => {
      const results = historyManager.filter({
        roles: ['user', 'delegation']
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(msg => {
        expect(['user', 'delegation']).toContain(msg.role);
      });
    });

    it('should filter by date range using options', () => {
      const fromDate = new Date('2025-01-15T10:00:02Z');
      const toDate = new Date('2025-01-15T10:00:05Z');

      const results = historyManager.filter({
        fromDate,
        toDate
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(msg => {
        expect(msg.timestamp.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
        expect(msg.timestamp.getTime()).toBeLessThanOrEqual(toDate.getTime());
      });
    });

    it('should filter with custom predicate in options', () => {
      const results = historyManager.filter({
        predicate: (msg) => msg.content.includes('token')
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(msg => {
        expect(msg.content.toLowerCase()).toContain('token');
      });
    });

    it('should combine multiple filter options', () => {
      const results = historyManager.filter({
        roles: ['assistant'],
        agents: ['claude'],
        predicate: (msg) => msg.content.length > 30
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(msg => {
        expect(msg.role).toBe('assistant');
        expect(msg.metadata.agent).toBe('claude');
        expect(msg.content.length).toBeGreaterThan(30);
      });
    });

    it('should limit results', () => {
      const results = historyManager.filter({
        roles: ['user', 'assistant'],
        limit: 2
      });

      expect(results).toHaveLength(2);
    });

    it('should return empty array when no matches', () => {
      const results = historyManager.filter({
        agents: ['nonexistent']
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('export', () => {
    describe('JSON format', () => {
      it('should export to JSON format', () => {
        const exported = historyManager.export('json');
        const parsed = JSON.parse(exported);

        expect(parsed).toHaveProperty('messages');
        expect(Array.isArray(parsed.messages)).toBe(true);
        expect(parsed.messages).toHaveLength(messages.length);
      });

      it('should include metadata by default', () => {
        const exported = historyManager.export('json');
        const parsed = JSON.parse(exported);

        expect(parsed.messages[1]).toHaveProperty('metadata');
        expect(parsed.messages[1].metadata).toHaveProperty('agent');
      });

      it('should exclude metadata when specified', () => {
        const exported = historyManager.export('json', {
          includeMetadata: false
        });
        const parsed = JSON.parse(exported);

        expect(parsed.messages[0]).not.toHaveProperty('metadata');
      });

      it('should pretty print by default', () => {
        const exported = historyManager.export('json', {
          prettyPrint: true
        });

        expect(exported).toContain('\n');
        expect(exported).toContain('  ');
      });

      it('should compact print when specified', () => {
        const exported = historyManager.export('json', {
          prettyPrint: false
        });

        // Compact JSON should not have newlines (except maybe at the end)
        const lines = exported.trim().split('\n');
        expect(lines.length).toBeLessThan(5);
      });

      it('should include stats when requested', () => {
        const exported = historyManager.export('json', {
          includeStats: true
        });
        const parsed = JSON.parse(exported);

        expect(parsed).toHaveProperty('stats');
        expect(parsed.stats).toHaveProperty('totalMessages');
        expect(parsed.stats).toHaveProperty('userMessages');
        expect(parsed.stats).toHaveProperty('assistantMessages');
      });

      it('should apply filter options', () => {
        const exported = historyManager.export('json', {
          filter: {
            roles: ['user']
          }
        });
        const parsed = JSON.parse(exported);

        expect(parsed.messages.length).toBeLessThan(messages.length);
        expect(parsed.messages.every((m: any) => m.role === 'user')).toBe(true);
      });
    });

    describe('Markdown format', () => {
      it('should export to Markdown format', () => {
        const exported = historyManager.export('md');

        expect(exported).toContain('# Conversation History');
        expect(exported).toContain('## Messages');
        expect(exported).toContain('### User');
        expect(exported).toContain('### Assistant');
      });

      it('should include timestamps when specified', () => {
        const exported = historyManager.export('md', {
          includeTimestamps: true
        });

        expect(exported).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      });

      it('should exclude timestamps when specified', () => {
        const exported = historyManager.export('md', {
          includeTimestamps: false
        });

        // Should still have header but not timestamps in message headers
        expect(exported).toContain('### User');
        expect(exported).not.toMatch(/### User.*\d{1,2}\/\d{1,2}\/\d{4}/);
      });

      it('should include stats when requested', () => {
        const exported = historyManager.export('md', {
          includeStats: true
        });

        expect(exported).toContain('## Statistics');
        expect(exported).toContain('**Total Messages:**');
        expect(exported).toContain('**User Messages:**');
        expect(exported).toContain('**Assistant Messages:**');
      });

      it('should include agent names', () => {
        const exported = historyManager.export('md');

        expect(exported).toContain('(claude)');
      });

      it('should apply filter options', () => {
        const exported = historyManager.export('md', {
          filter: {
            roles: ['assistant']
          }
        });

        expect(exported).toContain('### Assistant');
        // Should not contain user messages (beyond stats if included)
        const messageSection = exported.split('## Messages')[1] || '';
        expect(messageSection).not.toContain('### User');
      });
    });

    describe('Text format', () => {
      it('should export to text format', () => {
        const exported = historyManager.export('txt');

        expect(exported).toContain('Conversation History');
        expect(exported).toContain('User');
        expect(exported).toContain('Assistant');
        expect(exported).toContain('===');
        expect(exported).toContain('---');
      });

      it('should include message numbers', () => {
        const exported = historyManager.export('txt');

        expect(exported).toContain('[1]');
        expect(exported).toContain('[2]');
      });

      it('should include timestamps when specified', () => {
        const exported = historyManager.export('txt', {
          includeTimestamps: true
        });

        expect(exported).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      });

      it('should include stats when requested', () => {
        const exported = historyManager.export('txt', {
          includeStats: true
        });

        expect(exported).toContain('STATISTICS:');
        expect(exported).toContain('Total Messages:');
        expect(exported).toContain('User Messages:');
      });

      it('should apply filter options', () => {
        const exported = historyManager.export('txt', {
          filter: {
            roles: ['user']
          }
        });

        const matches = exported.match(/\[\d+\]/g);
        expect(matches).toBeDefined();
        expect(matches!.length).toBeLessThan(messages.length);
      });
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        historyManager.export('invalid' as any);
      }).toThrow('Unsupported export format');
    });
  });

  describe('getStats', () => {
    it('should return correct message counts', () => {
      const stats = historyManager.getStats();

      expect(stats.totalMessages).toBe(7);
      expect(stats.userMessages).toBe(3);
      expect(stats.assistantMessages).toBe(3);
      expect(stats.delegationMessages).toBe(1);
      expect(stats.systemMessages).toBe(0);
    });

    it('should count messages by agent', () => {
      const stats = historyManager.getStats();

      expect(stats.messagesByAgent).toHaveProperty('claude');
      expect(stats.messagesByAgent['claude']).toBe(3);
    });

    it('should calculate average message length', () => {
      const stats = historyManager.getStats();

      const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
      const expected = Math.round(totalLength / messages.length);

      expect(stats.averageMessageLength).toBe(expected);
    });

    it('should include first and last message timestamps', () => {
      const stats = historyManager.getStats();

      expect(stats.firstMessage).toBeDefined();
      expect(stats.lastMessage).toBeDefined();
      expect(stats.firstMessage?.getTime()).toBe(messages[0].timestamp.getTime());
      expect(stats.lastMessage?.getTime()).toBe(messages[messages.length - 1].timestamp.getTime());
    });

    it('should calculate conversation duration', () => {
      const stats = historyManager.getStats();

      expect(stats.conversationDuration).toBeDefined();
      const expectedDuration = messages[messages.length - 1].timestamp.getTime() -
        messages[0].timestamp.getTime();
      expect(stats.conversationDuration).toBe(expectedDuration);
    });

    it('should handle empty message list', () => {
      const emptyManager = new HistoryManager([]);
      const stats = emptyManager.getStats();

      expect(stats.totalMessages).toBe(0);
      expect(stats.userMessages).toBe(0);
      expect(stats.assistantMessages).toBe(0);
      expect(stats.averageMessageLength).toBe(0);
      expect(stats.firstMessage).toBeUndefined();
      expect(stats.lastMessage).toBeUndefined();
      expect(stats.conversationDuration).toBeUndefined();
    });

    it('should handle single message', () => {
      const singleManager = new HistoryManager([messages[0]]);
      const stats = singleManager.getStats();

      expect(stats.totalMessages).toBe(1);
      expect(stats.firstMessage).toBeDefined();
      expect(stats.lastMessage).toBeDefined();
      expect(stats.conversationDuration).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty message list in search', () => {
      const emptyManager = new HistoryManager([]);
      const results = emptyManager.search('test') as Message[];

      expect(results).toHaveLength(0);
    });

    it('should handle empty message list in filter', () => {
      const emptyManager = new HistoryManager([]);
      const results = emptyManager.filter({ roles: ['user'] });

      expect(results).toHaveLength(0);
    });

    it('should handle empty message list in export', () => {
      const emptyManager = new HistoryManager([]);
      const exported = emptyManager.export('json');
      const parsed = JSON.parse(exported);

      expect(parsed.messages).toHaveLength(0);
    });

    it('should handle messages without agent metadata', () => {
      const messagesWithoutAgent = [
        new Message('user', 'Test message')
      ];
      const manager = new HistoryManager(messagesWithoutAgent);

      const results = manager.filter({ agents: ['claude'] });
      expect(results).toHaveLength(0);
    });

    it('should handle very long messages in export', () => {
      const longMessage = new Message('user', 'x'.repeat(10000));
      const manager = new HistoryManager([longMessage]);

      const exported = manager.export('txt');
      expect(exported).toContain('x'.repeat(100)); // Should contain the message
    });
  });
});
