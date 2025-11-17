import { describe, it, expect, beforeEach } from '@jest/globals';
import { PTYEventEmitter } from '../../src/features/execution/pty/PTYEventEmitter.js';

describe('PTYEventEmitter', () => {
  let emitter: PTYEventEmitter;

  beforeEach(() => {
    emitter = new PTYEventEmitter(3); // Low limit for testing
  });

  describe('Handler Registration', () => {
    it('should register data handlers', () => {
      emitter.initializeHandlers('test-id');

      const handler = (_data: string) => { /* noop */ };
      emitter.onData('test-id', handler);

      const stats = emitter.getHandlerStats('test-id');
      expect(stats?.dataHandlers).toBe(1);
    });

    it('should register exit handlers', () => {
      emitter.initializeHandlers('test-id');

      const handler = (_info: any) => { /* noop */ };
      emitter.onExit('test-id', handler);

      const stats = emitter.getHandlerStats('test-id');
      expect(stats?.exitHandlers).toBe(1);
    });

    it('should throw when max data handlers exceeded', () => {
      emitter.initializeHandlers('test-id');

      // Add 3 handlers (max)
      for (let i = 0; i < 3; i++) {
        emitter.onData('test-id', (_data) => { /* noop */ });
      }

      // 4th should throw
      expect(() => {
        emitter.onData('test-id', (_data) => { /* noop */ });
      }).toThrow(/Maximum listeners.*exceeded/);
    });

    it('should throw when max exit handlers exceeded', () => {
      emitter.initializeHandlers('test-id');

      // Add 3 handlers (max)
      for (let i = 0; i < 3; i++) {
        emitter.onExit('test-id', (_info) => { /* noop */ });
      }

      // 4th should throw
      expect(() => {
        emitter.onExit('test-id', (_info) => { /* noop */ });
      }).toThrow(/Maximum listeners.*exceeded/);
    });

    it('should throw when registering handler for non-initialized process', () => {
      expect(() => {
        emitter.onData('non-existent', (_data) => { /* noop */ });
      }).toThrow(/No handlers initialized/);
    });
  });

  describe('Handler Removal', () => {
    it('should remove data handler', () => {
      emitter.initializeHandlers('test-id');

      const handler = (_data: string) => { /* noop */ };
      emitter.onData('test-id', handler);

      expect(emitter.removeDataHandler('test-id', handler)).toBe(true);

      const stats = emitter.getHandlerStats('test-id');
      expect(stats?.dataHandlers).toBe(0);
    });

    it('should return false when removing non-existent handler', () => {
      emitter.initializeHandlers('test-id');
      const handler = (_data: string) => { /* noop */ };

      expect(emitter.removeDataHandler('test-id', handler)).toBe(false);
    });

    it('should remove exit handler', () => {
      emitter.initializeHandlers('test-id');

      const handler = (_info: any) => { /* noop */ };
      emitter.onExit('test-id', handler);

      expect(emitter.removeExitHandler('test-id', handler)).toBe(true);

      const stats = emitter.getHandlerStats('test-id');
      expect(stats?.exitHandlers).toBe(0);
    });

    it('should remove all handlers using removeAllHandlers', () => {
      emitter.initializeHandlers('test-id');

      emitter.onData('test-id', (_data) => { /* noop */ });
      emitter.onExit('test-id', (_info) => { /* noop */ });

      emitter.removeAllHandlers('test-id');

      expect(emitter.hasHandlers('test-id')).toBe(false);
    });

    it('should remove all handlers using remove (backward compatibility)', () => {
      emitter.initializeHandlers('test-id');

      emitter.onData('test-id', (_data) => { /* noop */ });
      emitter.onExit('test-id', (_info) => { /* noop */ });

      emitter.remove('test-id');

      expect(emitter.hasHandlers('test-id')).toBe(false);
    });

    it('should clear all handlers for all processes', () => {
      emitter.initializeHandlers('process-1');
      emitter.initializeHandlers('process-2');

      emitter.onData('process-1', (_data) => { /* noop */ });
      emitter.onData('process-2', (_data) => { /* noop */ });

      emitter.clear();

      expect(emitter.getProcessIds()).toHaveLength(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit data to all handlers', () => {
      emitter.initializeHandlers('test-id');

      const results: string[] = [];
      emitter.onData('test-id', (data) => results.push(data));
      emitter.onData('test-id', (data) => results.push(data.toUpperCase()));

      emitter.emitData('test-id', 'hello');

      expect(results).toEqual(['hello', 'HELLO']);
    });

    it('should emit exit to all handlers', () => {
      emitter.initializeHandlers('test-id');

      const results: number[] = [];
      emitter.onExit('test-id', (info) => results.push(info.exitCode));
      emitter.onExit('test-id', (info) => results.push(info.exitCode * 2));

      emitter.emitExit('test-id', { exitCode: 1 });

      expect(results).toEqual([1, 2]);
    });

    it('should clean up handlers after exit', () => {
      emitter.initializeHandlers('test-id');
      emitter.onData('test-id', (_data) => { /* noop */ });
      emitter.onExit('test-id', (_info) => { /* noop */ });

      emitter.emitExit('test-id', { exitCode: 0 });

      expect(emitter.hasHandlers('test-id')).toBe(false);
    });

    it('should handle errors in data handlers gracefully', () => {
      emitter.initializeHandlers('test-id');

      const consoleError = console.error;
      const errors: any[] = [];
      console.error = (...args: any[]) => errors.push(args);

      emitter.onData('test-id', () => {
        throw new Error('Handler error');
      });

      emitter.emitData('test-id', 'test');

      expect(errors.length).toBeGreaterThan(0);

      console.error = consoleError;
    });

    it('should handle errors in exit handlers gracefully', () => {
      emitter.initializeHandlers('test-id');

      const consoleError = console.error;
      const errors: any[] = [];
      console.error = (...args: any[]) => errors.push(args);

      emitter.onExit('test-id', () => {
        throw new Error('Handler error');
      });

      emitter.emitExit('test-id', { exitCode: 0 });

      expect(errors.length).toBeGreaterThan(0);

      console.error = consoleError;
    });

    it('should handle emitting to non-existent process gracefully', () => {
      // Should not throw
      emitter.emitData('non-existent', 'test');
      emitter.emitExit('non-existent', { exitCode: 0 });

      // Just verify no exception was thrown
      expect(true).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should return correct handler stats', () => {
      emitter.initializeHandlers('test-id');

      emitter.onData('test-id', (_data) => { /* noop */ });
      emitter.onData('test-id', (_data) => { /* noop */ });
      emitter.onExit('test-id', (_info) => { /* noop */ });

      const stats = emitter.getHandlerStats('test-id');
      expect(stats).not.toBeNull();
      expect(stats!.dataHandlers).toBe(2);
      expect(stats!.exitHandlers).toBe(1);
      expect(stats!.totalHandlers).toBe(3);
      expect(stats!.maxListeners).toBe(3);
      expect(stats!.utilizationPercent).toBeCloseTo(66.67, 1);
    });

    it('should return null stats for non-existent process', () => {
      const stats = emitter.getHandlerStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should return all process IDs', () => {
      emitter.initializeHandlers('process-1');
      emitter.initializeHandlers('process-2');

      const ids = emitter.getProcessIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('process-1');
      expect(ids).toContain('process-2');
    });

    it('should count total handlers across all processes', () => {
      emitter.initializeHandlers('process-1');
      emitter.initializeHandlers('process-2');

      emitter.onData('process-1', (_data) => { /* noop */ });
      emitter.onData('process-2', (_data) => { /* noop */ });
      emitter.onExit('process-1', (_info) => { /* noop */ });

      expect(emitter.getTotalHandlerCount()).toBe(3);
    });

    it('should check if process has handlers', () => {
      emitter.initializeHandlers('test-id');

      expect(emitter.hasHandlers('test-id')).toBe(true);
      expect(emitter.hasHandlers('non-existent')).toBe(false);
    });
  });

  describe('Initialization', () => {
    it('should initialize handlers for a process', () => {
      emitter.initializeHandlers('test-id');

      expect(emitter.hasHandlers('test-id')).toBe(true);

      const stats = emitter.getHandlerStats('test-id');
      expect(stats?.dataHandlers).toBe(0);
      expect(stats?.exitHandlers).toBe(0);
    });

    it('should use default max listeners', () => {
      const defaultEmitter = new PTYEventEmitter();
      defaultEmitter.initializeHandlers('test-id');

      const stats = defaultEmitter.getHandlerStats('test-id');
      expect(stats?.maxListeners).toBe(10); // DEFAULT_MAX_LISTENERS
    });

    it('should use custom max listeners', () => {
      const customEmitter = new PTYEventEmitter(5);
      customEmitter.initializeHandlers('test-id');

      const stats = customEmitter.getHandlerStats('test-id');
      expect(stats?.maxListeners).toBe(5);
    });
  });
});
