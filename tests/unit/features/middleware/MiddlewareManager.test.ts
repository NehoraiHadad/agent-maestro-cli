/**
 * Tests for MiddlewareManager
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MiddlewareManager } from '../../../../src/features/middleware/MiddlewareManager.js';
import type { Middleware, MiddlewareContext } from '../../../../src/features/middleware/types.js';
import type { AgentExecutionResult } from '../../../../src/shared/types/index.js';

describe('MiddlewareManager', () => {
  let manager: MiddlewareManager;
  let context: MiddlewareContext;

  beforeEach(() => {
    manager = new MiddlewareManager();
    context = {
      agent: 'claude',
      sessionId: 'test-session',
      timestamp: Date.now(),
      metadata: {},
    };
  });

  describe('Middleware Registration', () => {
    it('should register a middleware', () => {
      const middleware: Middleware = {
        name: 'test',
        before: async (msg: string) => msg,
      };

      manager.use(middleware);
      expect(manager.has('test')).toBe(true);
    });

    it('should throw error for duplicate middleware names', () => {
      const middleware1: Middleware = { name: 'test' };
      const middleware2: Middleware = { name: 'test' };

      manager.use(middleware1);
      expect(() => manager.use(middleware2)).toThrow(/already registered/);
    });

    it('should remove a middleware', () => {
      const middleware: Middleware = { name: 'test' };

      manager.use(middleware);
      expect(manager.has('test')).toBe(true);

      const removed = manager.remove('test');
      expect(removed).toBe(true);
      expect(manager.has('test')).toBe(false);
    });

    it('should return false when removing non-existent middleware', () => {
      const removed = manager.remove('non-existent');
      expect(removed).toBe(false);
    });

    it('should clear all middlewares', () => {
      manager.use({ name: 'test1' });
      manager.use({ name: 'test2' });

      expect(manager.has('test1')).toBe(true);
      expect(manager.has('test2')).toBe(true);

      manager.clear();

      expect(manager.has('test1')).toBe(false);
      expect(manager.has('test2')).toBe(false);
    });
  });

  describe('Priority Ordering', () => {
    it('should sort middlewares by priority (highest first)', () => {
      const low: Middleware = { name: 'low', priority: 1 };
      const medium: Middleware = { name: 'medium', priority: 5 };
      const high: Middleware = { name: 'high', priority: 10 };

      manager.use(low);
      manager.use(high);
      manager.use(medium);

      const all = manager.getAll();
      expect(all[0].name).toBe('high');
      expect(all[1].name).toBe('medium');
      expect(all[2].name).toBe('low');
    });

    it('should handle middlewares without priority', () => {
      const withPriority: Middleware = { name: 'with', priority: 5 };
      const withoutPriority: Middleware = { name: 'without' };

      manager.use(withoutPriority);
      manager.use(withPriority);

      const all = manager.getAll();
      expect(all[0].name).toBe('with'); // Priority 5
      expect(all[1].name).toBe('without'); // Priority 0 (default)
    });
  });

  describe('Before Hooks', () => {
    it('should run before hook on message', async () => {
      const beforeHook = async (msg: string) => msg.toUpperCase();
      const middleware: Middleware = {
        name: 'test',
        before: beforeHook,
      };

      manager.use(middleware);

      const result = await manager.runBefore('hello', context);

      expect(result).toBe('HELLO');
    });

    it('should chain multiple before hooks', async () => {
      const middleware1: Middleware = {
        name: 'uppercase',
        priority: 10,
        before: async (msg) => msg.toUpperCase(),
      };

      const middleware2: Middleware = {
        name: 'prefix',
        priority: 5,
        before: async (msg) => `PREFIX: ${msg}`,
      };

      manager.use(middleware1);
      manager.use(middleware2);

      const result = await manager.runBefore('hello', context);

      // Should run in priority order: uppercase (10) then prefix (5)
      expect(result).toBe('PREFIX: HELLO');
    });

    it('should handle middleware without before hook', async () => {
      const middleware: Middleware = {
        name: 'test',
      };

      manager.use(middleware);

      const result = await manager.runBefore('hello', context);
      expect(result).toBe('hello');
    });

    it('should continue on error if continueOnError is true', async () => {
      const errorMiddleware: Middleware = {
        name: 'error',
        before: async () => {
          throw new Error('Test error');
        },
      };

      const successMiddleware: Middleware = {
        name: 'success',
        before: async (msg) => msg.toUpperCase(),
      };

      manager.use(errorMiddleware);
      manager.use(successMiddleware);

      // Should not throw and continue with other middlewares
      const result = await manager.runBefore('hello', context);
      expect(result).toBe('HELLO');
    });

    it('should throw error if continueOnError is false', async () => {
      const errorManager = new MiddlewareManager({ continueOnError: false });

      const errorMiddleware: Middleware = {
        name: 'error',
        before: async () => {
          throw new Error('Test error');
        },
      };

      errorManager.use(errorMiddleware);

      await expect(errorManager.runBefore('hello', context)).rejects.toThrow(/Test error/);
    });

    it('should handle timeout', async () => {
      const slowManager = new MiddlewareManager({ maxExecutionTime: 100 });

      const slowMiddleware: Middleware = {
        name: 'slow',
        before: async (msg) => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return msg;
        },
      };

      slowManager.use(slowMiddleware);

      // Should timeout and continue with original message
      const result = await slowManager.runBefore('hello', context);
      expect(result).toBe('hello');
    });
  });

  describe('After Hooks', () => {
    it('should run after hook on result', async () => {
      const afterHook = async (result: AgentExecutionResult) => ({
        ...result,
        content: result.content.toUpperCase(),
      });

      const middleware: Middleware = {
        name: 'test',
        after: afterHook,
      };

      manager.use(middleware);

      const input: AgentExecutionResult = {
        agent: 'claude',
        content: 'hello',
        exitCode: 0,
      };

      const result = await manager.runAfter(input, context);

      expect(result.content).toBe('HELLO');
    });

    it('should chain multiple after hooks', async () => {
      const middleware1: Middleware = {
        name: 'uppercase',
        priority: 10,
        after: async (result) => ({
          ...result,
          content: result.content.toUpperCase(),
        }),
      };

      const middleware2: Middleware = {
        name: 'prefix',
        priority: 5,
        after: async (result) => ({
          ...result,
          content: `PREFIX: ${result.content}`,
        }),
      };

      manager.use(middleware1);
      manager.use(middleware2);

      const input: AgentExecutionResult = {
        agent: 'claude',
        content: 'hello',
        exitCode: 0,
      };

      const result = await manager.runAfter(input, context);

      // Should run in priority order: uppercase (10) then prefix (5)
      expect(result.content).toBe('PREFIX: HELLO');
    });

    it('should handle middleware without after hook', async () => {
      const middleware: Middleware = {
        name: 'test',
      };

      manager.use(middleware);

      const input: AgentExecutionResult = {
        agent: 'claude',
        content: 'hello',
        exitCode: 0,
      };

      const result = await manager.runAfter(input, context);
      expect(result).toEqual(input);
    });
  });

  describe('Performance Tracking', () => {
    it('should track middleware execution stats', async () => {
      const middleware: Middleware = {
        name: 'test',
        before: async (msg) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return msg;
        },
      };

      manager.use(middleware);

      await manager.runBefore('hello', context);
      await manager.runBefore('world', context);

      const stats = manager.getMiddlewareStats('test');
      expect(stats).toBeDefined();
      expect(stats?.executionCount).toBe(2);
      expect(stats?.totalExecutionTime).toBeGreaterThan(0);
      expect(stats?.averageExecutionTime).toBeGreaterThan(0);
      expect(stats?.errorCount).toBe(0);
    });

    it('should track errors in stats', async () => {
      const middleware: Middleware = {
        name: 'test',
        before: async () => {
          throw new Error('Test error');
        },
      };

      manager.use(middleware);

      await manager.runBefore('hello', context);

      const stats = manager.getMiddlewareStats('test');
      expect(stats?.errorCount).toBe(1);
    });

    it('should get all stats', async () => {
      const middleware1: Middleware = {
        name: 'test1',
        before: async (msg) => msg,
      };

      const middleware2: Middleware = {
        name: 'test2',
        before: async (msg) => msg,
      };

      manager.use(middleware1);
      manager.use(middleware2);

      await manager.runBefore('hello', context);

      const allStats = manager.getStats();
      expect(allStats).toHaveLength(2);
      expect(allStats.some(s => s.name === 'test1')).toBe(true);
      expect(allStats.some(s => s.name === 'test2')).toBe(true);
    });

    it('should reset stats', async () => {
      const middleware: Middleware = {
        name: 'test',
        before: async (msg) => msg,
      };

      manager.use(middleware);

      await manager.runBefore('hello', context);

      let stats = manager.getMiddlewareStats('test');
      expect(stats?.executionCount).toBe(1);

      manager.resetStats();

      stats = manager.getMiddlewareStats('test');
      expect(stats?.executionCount).toBe(0);
      expect(stats?.totalExecutionTime).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', async () => {
      const middleware: Middleware = {
        name: 'test',
        before: async (msg) => msg || 'default',
      };

      manager.use(middleware);

      const result = await manager.runBefore('', context);
      expect(result).toBe('default');
    });

    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(10000);

      const middleware: Middleware = {
        name: 'test',
        before: async (msg) => msg,
      };

      manager.use(middleware);

      const result = await manager.runBefore(longMessage, context);
      expect(result).toBe(longMessage);
    });

    it('should work with no registered middlewares', async () => {
      const result = await manager.runBefore('hello', context);
      expect(result).toBe('hello');

      const input: AgentExecutionResult = {
        agent: 'claude',
        content: 'hello',
        exitCode: 0,
      };

      const afterResult = await manager.runAfter(input, context);
      expect(afterResult).toEqual(input);
    });
  });
});
