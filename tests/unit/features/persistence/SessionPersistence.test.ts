import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SessionPersistence } from '../../../../src/features/persistence/SessionPersistence.js';
import { FileSystemStorage } from '../../../../src/features/persistence/FileSystemStorage.js';
import { SessionExport } from '../../../../src/features/orchestration/SessionManager.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SessionPersistence', () => {
  let persistence: SessionPersistence;
  let storage: FileSystemStorage;
  let testDir: string;

  // Helper to create a mock session export
  const createMockSession = (sessionId: string, messageCount: number = 3): SessionExport => {
    const now = new Date();
    return {
      sessionId,
      startTime: now,
      messages: [
        {
          id: 'msg_1',
          role: 'user',
          content: 'Hello',
          metadata: {},
          timestamp: now.toISOString()
        },
        {
          id: 'msg_2',
          role: 'assistant',
          content: 'Hi there',
          metadata: { agent: 'claude' },
          timestamp: now.toISOString()
        },
        {
          id: 'msg_3',
          role: 'user',
          content: 'How are you?',
          metadata: {},
          timestamp: now.toISOString()
        }
      ].slice(0, messageCount),
      summary: {
        sessionId,
        startTime: now,
        messageCount,
        userMessages: Math.ceil(messageCount / 2),
        assistantMessages: Math.floor(messageCount / 2),
        delegationMessages: 0,
        duration: 60000
      }
    };
  };

  beforeEach(async () => {
    testDir = join(tmpdir(), `maestro-test-${Date.now()}`);
    storage = new FileSystemStorage(testDir);
    persistence = new SessionPersistence(storage);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('save', () => {
    it('should save a session', async () => {
      const session = createMockSession('session_test1');

      const savedId = await persistence.save(session);

      expect(savedId).toBe('session_test1');
      expect(await persistence.exists('session_test1')).toBe(true);
    });

    it('should save session with metadata', async () => {
      const session = createMockSession('session_test2');

      await persistence.save(session, {
        name: 'Test Session',
        tags: ['test', 'demo']
      });

      const loaded = await persistence.load('session_test2');
      expect(loaded.metadata.name).toBe('Test Session');
      expect(loaded.metadata.tags).toEqual(['test', 'demo']);
    });

    it('should update index when saving', async () => {
      const session = createMockSession('session_test3');

      await persistence.save(session);

      const sessions = await persistence.list();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe('session_test3');
    });
  });

  describe('load', () => {
    it('should load a saved session', async () => {
      const session = createMockSession('session_test4');
      await persistence.save(session);

      const loaded = await persistence.load('session_test4');

      expect(loaded.data.sessionId).toBe('session_test4');
      expect(loaded.data.messages).toHaveLength(3);
    });

    it('should throw error when loading non-existent session', async () => {
      await expect(persistence.load('nonexistent')).rejects.toThrow();
    });

    it('should convert date strings back to Date objects', async () => {
      const session = createMockSession('session_test5');
      await persistence.save(session);

      const loaded = await persistence.load('session_test5');

      expect(loaded.metadata.createdAt).toBeInstanceOf(Date);
      expect(loaded.metadata.updatedAt).toBeInstanceOf(Date);
      expect(loaded.data.startTime).toBeInstanceOf(Date);
    });
  });

  describe('list', () => {
    it('should list all saved sessions', async () => {
      await persistence.save(createMockSession('session_1'));
      await persistence.save(createMockSession('session_2'));
      await persistence.save(createMockSession('session_3'));

      const sessions = await persistence.list();

      expect(sessions).toHaveLength(3);
    });

    it('should return empty array when no sessions exist', async () => {
      const sessions = await persistence.list();
      expect(sessions).toEqual([]);
    });

    it('should include metadata in list', async () => {
      await persistence.save(createMockSession('session_1'), {
        name: 'First Session'
      });

      const sessions = await persistence.list();

      expect(sessions[0].name).toBe('First Session');
      expect(sessions[0].sessionId).toBe('session_1');
    });
  });

  describe('delete', () => {
    it('should delete a session', async () => {
      await persistence.save(createMockSession('session_test6'));

      await persistence.delete('session_test6');

      expect(await persistence.exists('session_test6')).toBe(false);
    });

    it('should remove session from index when deleting', async () => {
      await persistence.save(createMockSession('session_test7'));
      await persistence.delete('session_test7');

      const sessions = await persistence.list();
      expect(sessions).toHaveLength(0);
    });

    it('should throw error when deleting non-existent session', async () => {
      await expect(persistence.delete('nonexistent')).rejects.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true for existing session', async () => {
      await persistence.save(createMockSession('session_test8'));

      expect(await persistence.exists('session_test8')).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      expect(await persistence.exists('nonexistent')).toBe(false);
    });
  });

  describe('findByName', () => {
    it('should find sessions by name', async () => {
      await persistence.save(createMockSession('session_1'), { name: 'Test Session' });
      await persistence.save(createMockSession('session_2'), { name: 'Another Test' });
      await persistence.save(createMockSession('session_3'), { name: 'Different' });

      const results = await persistence.findByName('test');

      expect(results).toHaveLength(2);
    });

    it('should perform case-insensitive search', async () => {
      await persistence.save(createMockSession('session_1'), { name: 'TEST SESSION' });

      const results = await persistence.findByName('test');

      expect(results).toHaveLength(1);
    });
  });

  describe('findByTag', () => {
    it('should find sessions by tag', async () => {
      await persistence.save(createMockSession('session_1'), { tags: ['important', 'work'] });
      await persistence.save(createMockSession('session_2'), { tags: ['personal'] });
      await persistence.save(createMockSession('session_3'), { tags: ['work', 'urgent'] });

      const results = await persistence.findByTag('work');

      expect(results).toHaveLength(2);
    });
  });

  describe('exportToJson', () => {
    it('should export session as JSON string', async () => {
      await persistence.save(createMockSession('session_test9'));

      const json = await persistence.exportToJson('session_test9');

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.data.sessionId).toBe('session_test9');
    });
  });

  describe('exportToMarkdown', () => {
    it('should export session as Markdown', async () => {
      await persistence.save(createMockSession('session_test10'), {
        name: 'Test Markdown Export'
      });

      const markdown = await persistence.exportToMarkdown('session_test10');

      expect(markdown).toContain('# Session: Test Markdown Export');
      expect(markdown).toContain('## Conversation');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('Hello');
      expect(markdown).toContain('Hi there');
    });

    it('should include tags in markdown export', async () => {
      await persistence.save(createMockSession('session_test11'), {
        name: 'Tagged Session',
        tags: ['test', 'demo']
      });

      const markdown = await persistence.exportToMarkdown('session_test11');

      expect(markdown).toContain('**Tags:** test, demo');
    });
  });
});
