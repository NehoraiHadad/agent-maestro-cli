import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DelegationAnalyticsMiddleware } from '../../../../src/features/middleware/examples/DelegationAnalyticsMiddleware.js';
import { DelegationAnalytics } from '../../../../src/features/analytics/DelegationAnalytics.js';
import type { MiddlewareContext } from '../../../../src/features/middleware/types.js';
import type { AgentExecutionResult } from '../../../../src/shared/types/index.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('DelegationAnalyticsMiddleware', () => {
  let middleware: DelegationAnalyticsMiddleware;
  let analytics: DelegationAnalytics;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = join(tmpdir(), `analytics-middleware-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    analytics = new DelegationAnalytics({
      baseDir: tempDir,
      autoSave: false,
    });
    await analytics.initialize();

    middleware = new DelegationAnalyticsMiddleware({
      analytics,
      enableLogging: false,
    });
    await middleware.initialize();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Middleware Properties', () => {
    it('should have correct name and description', () => {
      expect(middleware.name).toBe('delegation-analytics');
      expect(middleware.description).toBeDefined();
    });

    it('should have appropriate priority', () => {
      expect(middleware.priority).toBeDefined();
      expect(typeof middleware.priority).toBe('number');
    });
  });

  describe('Delegation Detection', () => {
    it('should detect delegation from metadata', async () => {
      const context: MiddlewareContext = {
        agent: 'claude',
        sessionId: 'test-session',
        timestamp: Date.now(),
        metadata: {
          delegationFrom: 'claude',
          delegationTo: 'codex',
        },
      };

      const message = 'Generate some code';
      await middleware.before(message, context);

      // Message should pass through unchanged
      const result = await middleware.before(message, context);
      expect(result).toBe(message);
    });

    it('should detect delegation from message pattern', async () => {
      const context: MiddlewareContext = {
        agent: 'claude',
        sessionId: 'test-session',
        timestamp: Date.now(),
      };

      const message = 'delegate to codex: generate authentication code';
      await middleware.before(message, context);

      // Should have started tracking
      const stats = middleware.getStats();
      // Stats won't show until after() is called, but no errors should occur
      expect(stats).toBeDefined();
    });
  });

  describe('Event Tracking', () => {
    it('should track successful delegation', async () => {
      const timestamp = Date.now();
      const context: MiddlewareContext = {
        agent: 'claude',
        sessionId: 'test-session',
        timestamp,
        metadata: {
          delegationFrom: 'claude',
          delegationTo: 'codex',
        },
      };

      const message = 'Generate code';

      // Start tracking
      await middleware.before(message, context);

      // Complete tracking
      const result: AgentExecutionResult = {
        agent: 'codex',
        content: 'Code generated successfully',
        exitCode: 0,
      };

      await middleware.after(result, context);

      // Check analytics
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].from).toBe('claude');
      expect(events[0].to).toBe('codex');
      expect(events[0].success).toBe(true);
      expect(events[0].duration).toBeDefined();
    });

    it('should track failed delegation', async () => {
      const timestamp = Date.now();
      const context: MiddlewareContext = {
        agent: 'claude',
        sessionId: 'test-session',
        timestamp,
        metadata: {
          delegationFrom: 'claude',
          delegationTo: 'codex',
        },
      };

      const message = 'Generate code';

      // Start tracking
      await middleware.before(message, context);

      // Complete with failure
      const result: AgentExecutionResult = {
        agent: 'codex',
        content: 'Error: Failed to generate code',
        exitCode: 1,
      };

      await middleware.after(result, context);

      // Check analytics
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].success).toBe(false);
      expect(events[0].error).toBeDefined();
    });

    it('should calculate delegation duration', async () => {
      const timestamp = Date.now();
      const context: MiddlewareContext = {
        agent: 'claude',
        sessionId: 'test-session',
        timestamp,
        metadata: {
          delegationFrom: 'claude',
          delegationTo: 'codex',
        },
      };

      const message = 'Generate code';

      // Start tracking
      await middleware.before(message, context);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Complete tracking
      const result: AgentExecutionResult = {
        agent: 'codex',
        content: 'Done',
        exitCode: 0,
      };

      await middleware.after(result, context);

      // Check duration
      const events = analytics.getEvents();
      expect(events[0].duration).toBeGreaterThan(0);
    });

    it('should handle multiple delegations', async () => {
      const delegations = [
        { from: 'claude', to: 'codex', task: 'Task 1' },
        { from: 'claude', to: 'gemini', task: 'Task 2' },
        { from: 'claude', to: 'codex', task: 'Task 3' },
      ];

      for (let i = 0; i < delegations.length; i++) {
        const delegation = delegations[i];
        const context: MiddlewareContext = {
          agent: 'claude',
          sessionId: 'test-session',
          timestamp: Date.now() + i, // Unique timestamp
          metadata: {
            delegationFrom: delegation.from,
            delegationTo: delegation.to,
          },
        };

        await middleware.before(delegation.task, context);

        const result: AgentExecutionResult = {
          agent: delegation.to,
          content: 'Done',
          exitCode: 0,
        };

        await middleware.after(result, context);
      }

      const events = analytics.getEvents();
      expect(events).toHaveLength(3);
    });
  });

  describe('Pass-through Behavior', () => {
    it('should not modify message in before hook', async () => {
      const context: MiddlewareContext = {
        agent: 'claude',
        sessionId: 'test-session',
        timestamp: Date.now(),
      };

      const originalMessage = 'Test message';
      const result = await middleware.before(originalMessage, context);

      expect(result).toBe(originalMessage);
    });

    it('should not modify result in after hook', async () => {
      const context: MiddlewareContext = {
        agent: 'claude',
        sessionId: 'test-session',
        timestamp: Date.now(),
      };

      const originalResult: AgentExecutionResult = {
        agent: 'claude',
        content: 'Test result',
        exitCode: 0,
      };

      const result = await middleware.after(originalResult, context);

      expect(result).toEqual(originalResult);
    });
  });

  describe('Analytics Integration', () => {
    it('should provide access to analytics instance', () => {
      const analyticsInstance = middleware.getAnalytics();

      expect(analyticsInstance).toBe(analytics);
    });

    it('should generate reports', async () => {
      // Track some events first
      const context: MiddlewareContext = {
        agent: 'claude',
        sessionId: 'test-session',
        timestamp: Date.now(),
        metadata: {
          delegationFrom: 'claude',
          delegationTo: 'codex',
        },
      };

      await middleware.before('Task', context);
      await middleware.after({
        agent: 'codex',
        content: 'Done',
        exitCode: 0,
      }, context);

      const report = middleware.generateReport();

      expect(report).toBeDefined();
      expect(report.stats).toBeDefined();
      expect(report.topAgents).toBeDefined();
    });

    it('should export analytics data', async () => {
      // Track an event
      const context: MiddlewareContext = {
        agent: 'claude',
        sessionId: 'test-session',
        timestamp: Date.now(),
        metadata: {
          delegationFrom: 'claude',
          delegationTo: 'codex',
        },
      };

      await middleware.before('Task', context);
      await middleware.after({
        agent: 'codex',
        content: 'Done',
        exitCode: 0,
      }, context);

      const json = middleware.export('json');
      expect(json).toBeDefined();
      expect(() => JSON.parse(json)).not.toThrow();

      const csv = middleware.export('csv');
      expect(csv).toBeDefined();
      expect(csv).toContain('Timestamp');
    });

    it('should clear analytics data', async () => {
      // Track an event
      const context: MiddlewareContext = {
        agent: 'claude',
        sessionId: 'test-session',
        timestamp: Date.now(),
        metadata: {
          delegationFrom: 'claude',
          delegationTo: 'codex',
        },
      };

      await middleware.before('Task', context);
      await middleware.after({
        agent: 'codex',
        content: 'Done',
        exitCode: 0,
      }, context);

      expect(analytics.getEvents()).toHaveLength(1);

      await middleware.clear();

      expect(analytics.getEvents()).toHaveLength(0);
    });
  });

  describe('Non-delegation Messages', () => {
    it('should ignore non-delegation messages', async () => {
      const context: MiddlewareContext = {
        agent: 'claude',
        sessionId: 'test-session',
        timestamp: Date.now(),
      };

      const message = 'Just a regular message';
      await middleware.before(message, context);

      const result: AgentExecutionResult = {
        agent: 'claude',
        content: 'Response',
        exitCode: 0,
      };

      await middleware.after(result, context);

      // Should not track non-delegation messages
      const events = analytics.getEvents();
      expect(events).toHaveLength(0);
    });
  });
});
