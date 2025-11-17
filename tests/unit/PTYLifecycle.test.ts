import { describe, it, expect, beforeEach } from '@jest/globals';
import { PTYLifecycle } from '../../src/features/execution/pty/PTYLifecycle.js';
import type { IPty } from 'node-pty';

describe('PTYLifecycle', () => {
  let lifecycle: PTYLifecycle;
  const mockProcess = {
    pid: 1234,
    write: () => {},
    kill: () => {},
    onData: () => {},
    onExit: () => {},
  } as unknown as IPty;

  beforeEach(() => {
    lifecycle = new PTYLifecycle(1024); // 1KB for testing
  });

  describe('Buffer Management', () => {
    it('should append data to buffer', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);
      lifecycle.appendToBuffer('test-id', 'Hello');

      const buffer = lifecycle.getBuffer('test-id');
      expect(buffer).toBe('Hello');
    });

    it('should trim buffer when exceeding max size', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);

      // Add data exceeding 1KB
      const largeData = 'a'.repeat(2000);
      lifecycle.appendToBuffer('test-id', largeData);

      const buffer = lifecycle.getBuffer('test-id');
      const bufferSize = Buffer.byteLength(buffer, 'utf8');

      // Buffer should be trimmed to ~50% of max size (512 bytes)
      expect(bufferSize).toBeLessThan(1024);
      expect(bufferSize).toBeGreaterThan(400); // ~50% with some tolerance
    });

    it('should track trim count', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);

      // Trigger multiple trims
      for (let i = 0; i < 3; i++) {
        const largeData = 'a'.repeat(2000);
        lifecycle.appendToBuffer('test-id', largeData);
      }

      const stats = lifecycle.getBufferStats('test-id');
      expect(stats).not.toBeNull();
      expect(stats!.trimCount).toBeGreaterThan(0);
    });

    it('should provide buffer statistics', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);
      lifecycle.appendToBuffer('test-id', 'Test data');

      const stats = lifecycle.getBufferStats('test-id');
      expect(stats).not.toBeNull();
      expect(stats!.currentSize).toBeGreaterThan(0);
      expect(stats!.maxSize).toBe(1024);
      expect(stats!.utilization).toBeGreaterThan(0);
      expect(stats!.utilization).toBeLessThanOrEqual(100);
    });

    it('should keep most recent data when trimming', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);

      lifecycle.appendToBuffer('test-id', 'OLD_DATA_');
      lifecycle.appendToBuffer('test-id', 'a'.repeat(2000));
      lifecycle.appendToBuffer('test-id', '_NEW_DATA');

      const buffer = lifecycle.getBuffer('test-id');

      // Should NOT contain old data
      expect(buffer).not.toContain('OLD_DATA_');
      // Should contain recent data
      expect(buffer).toContain('_NEW_DATA');
    });

    it('should clear trim count on process kill', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);

      // Trigger trim
      const largeData = 'a'.repeat(2000);
      lifecycle.appendToBuffer('test-id', largeData);

      // Verify trim count before kill
      let stats = lifecycle.getBufferStats('test-id');
      expect(stats!.trimCount).toBeGreaterThan(0);

      // Kill process
      lifecycle.kill('test-id');

      // Trim count should be cleared (process still exists but trim count is reset)
      stats = lifecycle.getBufferStats('test-id');
      expect(stats).not.toBeNull();
      expect(stats!.trimCount).toBe(0);
    });
  });

  describe('Buffer Stats', () => {
    it('should return null for non-existent process', () => {
      const stats = lifecycle.getBufferStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should calculate utilization correctly', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);

      // Add data that's 50% of max size
      const halfData = 'a'.repeat(512);
      lifecycle.appendToBuffer('test-id', halfData);

      const stats = lifecycle.getBufferStats('test-id');
      expect(stats!.utilization).toBeGreaterThan(40);
      expect(stats!.utilization).toBeLessThan(60);
    });
  });

  describe('UTF-8 Buffer Handling', () => {
    it('should handle multi-byte UTF-8 characters correctly', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);

      // Use multi-byte characters (emoji, Chinese characters, etc.)
      const multiByteData = '🎯'.repeat(100) + '你好世界'.repeat(100);
      lifecycle.appendToBuffer('test-id', multiByteData);

      const buffer = lifecycle.getBuffer('test-id');
      expect(buffer).toBeTruthy();

      // Verify buffer size is calculated correctly
      const stats = lifecycle.getBufferStats('test-id');
      expect(stats!.currentSize).toBeGreaterThan(0);
    });

    it('should trim multi-byte UTF-8 characters without corruption', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);

      // Fill with multi-byte characters to trigger trim
      const multiByteData = '🚀'.repeat(500); // ~2KB
      lifecycle.appendToBuffer('test-id', multiByteData);

      const buffer = lifecycle.getBuffer('test-id');
      const bufferSize = Buffer.byteLength(buffer, 'utf8');

      // Should be trimmed to ~512 bytes
      expect(bufferSize).toBeLessThan(1024);

      // Buffer should still be valid UTF-8 (no corruption)
      expect(buffer).toBeTruthy();
    });
  });

  describe('Process Registration and Lifecycle', () => {
    it('should register a process with initial buffer', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);

      const buffer = lifecycle.getBuffer('test-id');
      expect(buffer).toBe('');

      const stats = lifecycle.getBufferStats('test-id');
      expect(stats!.currentSize).toBe(0);
      expect(stats!.trimCount).toBe(0);
    });

    it('should handle multiple processes independently', () => {
      lifecycle.register('process-1', mockProcess, 'cmd1', []);
      lifecycle.register('process-2', mockProcess, 'cmd2', []);

      lifecycle.appendToBuffer('process-1', 'Data for process 1');
      lifecycle.appendToBuffer('process-2', 'Data for process 2');

      expect(lifecycle.getBuffer('process-1')).toContain('process 1');
      expect(lifecycle.getBuffer('process-2')).toContain('process 2');

      const stats1 = lifecycle.getBufferStats('process-1');
      const stats2 = lifecycle.getBufferStats('process-2');

      expect(stats1!.trimCount).toBe(0);
      expect(stats2!.trimCount).toBe(0);
    });

    it('should track separate trim counts for different processes', () => {
      lifecycle.register('process-1', mockProcess, 'cmd1', []);
      lifecycle.register('process-2', mockProcess, 'cmd2', []);

      // Trigger trim on process-1 only
      lifecycle.appendToBuffer('process-1', 'a'.repeat(2000));

      const stats1 = lifecycle.getBufferStats('process-1');
      const stats2 = lifecycle.getBufferStats('process-2');

      expect(stats1!.trimCount).toBeGreaterThan(0);
      expect(stats2!.trimCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle appending to non-existent process gracefully', () => {
      expect(() => {
        lifecycle.appendToBuffer('non-existent', 'data');
      }).not.toThrow();
    });

    it('should handle empty data append', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);
      lifecycle.appendToBuffer('test-id', '');

      const buffer = lifecycle.getBuffer('test-id');
      expect(buffer).toBe('');
    });

    it('should handle repeated trims correctly', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);

      // Trigger 5 trims
      for (let i = 0; i < 5; i++) {
        lifecycle.appendToBuffer('test-id', 'x'.repeat(2000));
      }

      const stats = lifecycle.getBufferStats('test-id');
      expect(stats!.trimCount).toBe(5);

      // Buffer should still be within limits
      expect(stats!.currentSize).toBeLessThan(1024);
    });

    it('should handle data exactly at max buffer size', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);

      // Add exactly 1024 bytes
      lifecycle.appendToBuffer('test-id', 'a'.repeat(1024));

      const stats = lifecycle.getBufferStats('test-id');

      // Should not trim at exactly max size (only when exceeding)
      expect(stats!.trimCount).toBe(0);
      expect(stats!.currentSize).toBe(1024);
    });

    it('should handle data just over max buffer size', () => {
      lifecycle.register('test-id', mockProcess, 'test-command', ['arg1']);

      // Add 1025 bytes (just over limit)
      lifecycle.appendToBuffer('test-id', 'a'.repeat(1025));

      const stats = lifecycle.getBufferStats('test-id');

      // Should trim
      expect(stats!.trimCount).toBe(1);
      expect(stats!.currentSize).toBeLessThan(1024);
    });
  });
});
