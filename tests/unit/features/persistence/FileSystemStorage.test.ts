import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FileSystemStorage } from '../../../../src/features/persistence/FileSystemStorage.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FileSystemStorage', () => {
  let storage: FileSystemStorage;
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = join(tmpdir(), `maestro-test-${Date.now()}`);
    storage = new FileSystemStorage(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('write and read', () => {
    it('should write and read session data', async () => {
      const sessionId = 'session_test123';
      const data = JSON.stringify({ test: 'data' });

      await storage.write(sessionId, data);
      const retrieved = await storage.read(sessionId);

      expect(retrieved).toBe(data);
    });

    it('should throw error when reading non-existent session', async () => {
      await expect(storage.read('nonexistent')).rejects.toThrow('Session not found');
    });

    it('should overwrite existing session', async () => {
      const sessionId = 'session_test123';
      const data1 = JSON.stringify({ version: 1 });
      const data2 = JSON.stringify({ version: 2 });

      await storage.write(sessionId, data1);
      await storage.write(sessionId, data2);

      const retrieved = await storage.read(sessionId);
      expect(retrieved).toBe(data2);
    });
  });

  describe('list', () => {
    it('should list all session IDs', async () => {
      await storage.write('session_1', 'data1');
      await storage.write('session_2', 'data2');
      await storage.write('session_3', 'data3');

      const list = await storage.list();

      expect(list).toHaveLength(3);
      expect(list).toContain('session_1');
      expect(list).toContain('session_2');
      expect(list).toContain('session_3');
    });

    it('should return empty array when no sessions exist', async () => {
      const list = await storage.list();
      expect(list).toEqual([]);
    });

    it('should not include index file in list', async () => {
      await storage.write('session_1', 'data1');
      await storage.writeIndex({ sessions: {}, lastUpdated: new Date().toISOString() });

      const list = await storage.list();

      expect(list).toHaveLength(1);
      expect(list).not.toContain('sessions.index');
    });
  });

  describe('delete', () => {
    it('should delete existing session', async () => {
      const sessionId = 'session_test123';
      await storage.write(sessionId, 'data');

      await storage.delete(sessionId);

      await expect(storage.read(sessionId)).rejects.toThrow('Session not found');
    });

    it('should throw error when deleting non-existent session', async () => {
      await expect(storage.delete('nonexistent')).rejects.toThrow('Session not found');
    });
  });

  describe('exists', () => {
    it('should return true for existing session', async () => {
      const sessionId = 'session_test123';
      await storage.write(sessionId, 'data');

      const exists = await storage.exists(sessionId);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      const exists = await storage.exists('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('index operations', () => {
    it('should write and read index', async () => {
      const indexData = {
        sessions: {
          'session_1': { id: 'session_1', name: 'Test' }
        },
        lastUpdated: new Date().toISOString()
      };

      await storage.writeIndex(indexData);
      const retrieved = await storage.readIndex();

      expect(retrieved).toEqual(indexData);
    });

    it('should return default index when not exists', async () => {
      const index = await storage.readIndex();

      expect(index).toHaveProperty('sessions');
      expect(index).toHaveProperty('lastUpdated');
      expect(index.sessions).toEqual({});
    });
  });

  describe('getBaseDir', () => {
    it('should return the base directory', () => {
      expect(storage.getBaseDir()).toBe(testDir);
    });
  });
});
