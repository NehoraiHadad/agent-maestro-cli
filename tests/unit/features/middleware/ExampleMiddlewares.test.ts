/**
 * Tests for example middlewares
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AnalyticsMiddleware } from '../../../../src/features/middleware/examples/AnalyticsMiddleware.js';
import { ContextInjectionMiddleware } from '../../../../src/features/middleware/examples/ContextInjectionMiddleware.js';
import { CachingMiddleware } from '../../../../src/features/middleware/examples/CachingMiddleware.js';
import type { MiddlewareContext } from '../../../../src/features/middleware/types.js';
import type { AgentExecutionResult } from '../../../../src/shared/types/index.js';

describe('AnalyticsMiddleware', () => {
  let middleware: AnalyticsMiddleware;
  let context: MiddlewareContext;

  beforeEach(() => {
    middleware = new AnalyticsMiddleware({ enableLogging: false });
    context = {
      agent: 'claude',
      sessionId: 'test-session',
      timestamp: Date.now(),
      metadata: {},
    };
  });

  it('should track message sent event', async () => {
    const message = 'test message';
    await middleware.before(message, context);

    const events = middleware.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('message_sent');
    expect(events[0].agent).toBe('claude');
  });

  it('should track response received event', async () => {
    const result: AgentExecutionResult = {
      agent: 'claude',
      content: 'test response',
      exitCode: 0,
    };

    await middleware.after(result, context);

    const events = middleware.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('response_received');
    expect(events[0].metadata?.exitCode).toBe(0);
  });

  it('should track both message and response', async () => {
    const message = 'test message';
    const result: AgentExecutionResult = {
      agent: 'claude',
      content: 'test response',
      exitCode: 0,
    };

    await middleware.before(message, context);
    await middleware.after(result, context);

    const events = middleware.getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('message_sent');
    expect(events[1].type).toBe('response_received');
  });

  it('should calculate analytics summary', async () => {
    const message1 = 'hello';
    const message2 = 'world';
    const result1: AgentExecutionResult = {
      agent: 'claude',
      content: 'response 1',
      exitCode: 0,
    };
    const result2: AgentExecutionResult = {
      agent: 'claude',
      content: 'response 2',
      exitCode: 0,
    };

    await middleware.before(message1, context);
    await middleware.after(result1, context);
    await middleware.before(message2, context);
    await middleware.after(result2, context);

    const summary = middleware.getSummary();
    expect(summary.totalMessages).toBe(2);
    expect(summary.totalResponses).toBe(2);
    expect(summary.totalErrors).toBe(0);
    expect(summary.averageMessageLength).toBeGreaterThan(0);
    expect(summary.averageResponseLength).toBeGreaterThan(0);
  });

  it('should call custom event handler', async () => {
    const onEvent = () => {};
    const middleware = new AnalyticsMiddleware({ enableLogging: false, onEvent });

    await middleware.before('test', context);

  });

  it('should get events by type', async () => {
    const result: AgentExecutionResult = {
      agent: 'claude',
      content: 'response',
      exitCode: 0,
    };

    await middleware.before('message1', context);
    await middleware.before('message2', context);
    await middleware.after(result, context);

    const messageEvents = middleware.getEventsByType('message_sent');
    const responseEvents = middleware.getEventsByType('response_received');

    expect(messageEvents).toHaveLength(2);
    expect(responseEvents).toHaveLength(1);
  });

  it('should clear events', async () => {
    await middleware.before('test', context);

    expect(middleware.getEvents()).toHaveLength(1);

    middleware.clearEvents();

    expect(middleware.getEvents()).toHaveLength(0);
  });

  it('should not break on event handler error', async () => {
    const onEvent = () => {
      throw new Error('Handler error');
    };
    const middleware = new AnalyticsMiddleware({ enableLogging: false, onEvent });

    // Should not throw
    await expect(middleware.before('test', context)).resolves.toBe('test');
  });
});

describe('ContextInjectionMiddleware', () => {
  let middleware: ContextInjectionMiddleware;
  let context: MiddlewareContext;

  beforeEach(() => {
    context = {
      agent: 'claude',
      sessionId: 'test-session',
      timestamp: Date.now(),
      metadata: {},
    };
  });

  it('should inject timestamp', async () => {
    middleware = new ContextInjectionMiddleware({
      includeTimestamp: true,
    });

    const result = await middleware.before('hello', context);

    expect(result).toContain('[Timestamp:');
    expect(result).toContain('hello');
  });

  it('should inject system information', async () => {
    middleware = new ContextInjectionMiddleware({
      includeSystem: true,
    });

    const result = await middleware.before('hello', context);

    expect(result).toContain('[System:');
    expect(result).toContain('hello');
  });

  it('should inject project information', async () => {
    middleware = new ContextInjectionMiddleware({
      includeProject: true,
    });

    const result = await middleware.before('hello', context);

    expect(result).toContain('[Project:');
    expect(result).toContain('hello');
  });

  it('should inject custom context', async () => {
    middleware = new ContextInjectionMiddleware({
      customContext: { foo: 'bar', baz: 123 },
    });

    const result = await middleware.before('hello', context);

    expect(result).toContain('[Context:');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
    expect(result).toContain('hello');
  });

  it('should inject all context types', async () => {
    middleware = new ContextInjectionMiddleware({
      includeTimestamp: true,
      includeSystem: true,
      includeProject: true,
      customContext: { test: true },
    });

    const result = await middleware.before('hello', context);

    expect(result).toContain('[Timestamp:');
    expect(result).toContain('[System:');
    expect(result).toContain('[Project:');
    expect(result).toContain('[Context:');
    expect(result).toContain('hello');
  });

  it('should return original message when no options enabled', async () => {
    middleware = new ContextInjectionMiddleware({});

    const result = await middleware.before('hello', context);

    expect(result).toBe('hello');
  });
});

describe('CachingMiddleware', () => {
  let middleware: CachingMiddleware;
  let context: MiddlewareContext;
  let result: AgentExecutionResult;

  beforeEach(() => {
    middleware = new CachingMiddleware({ enableLogging: false });
    context = {
      agent: 'claude',
      sessionId: 'test-session',
      timestamp: Date.now(),
      metadata: {},
    };
    result = {
      agent: 'claude',
      content: 'test response',
      exitCode: 0,
    };
  });

  it('should cache result after execution', async () => {
    context.metadata = { originalMessage: 'hello' };

    await middleware.after(result, context);

    const cached = middleware.get('hello', 'claude');
    expect(cached).toBeDefined();
    expect(cached?.content).toBe('test response');
  });

  it('should return null for cache miss', () => {
    const cached = middleware.get('non-existent', 'claude');
    expect(cached).toBeNull();
  });

  it('should increment hit counter', async () => {
    context.metadata = { originalMessage: 'hello' };

    await middleware.after(result, context);

    middleware.get('hello', 'claude');
    middleware.get('hello', 'claude');
    middleware.get('hello', 'claude');

    const stats = middleware.getStats();
    expect(stats.totalHits).toBe(3);
  });

  it('should expire cached entries after TTL', async () => {
    const shortTTL = new CachingMiddleware({
      ttl: 10, // 10ms
      enableLogging: false,
    });

    context.metadata = { originalMessage: 'hello' };
    await shortTTL.after(result, context);

    // Should be cached
    let cached = shortTTL.get('hello', 'claude');
    expect(cached).toBeDefined();

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 20));

    // Should be expired
    cached = shortTTL.get('hello', 'claude');
    expect(cached).toBeNull();
  });

  it('should evict oldest entry when cache is full', async () => {
    const smallCache = new CachingMiddleware({
      maxSize: 2,
      enableLogging: false,
    });

    const ctx1 = { ...context, metadata: { originalMessage: 'msg1' } };
    const ctx2 = { ...context, metadata: { originalMessage: 'msg2' } };
    const ctx3 = { ...context, metadata: { originalMessage: 'msg3' } };

    await smallCache.after(result, ctx1);
    await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
    await smallCache.after(result, ctx2);
    await new Promise(resolve => setTimeout(resolve, 10));
    await smallCache.after(result, ctx3);

    // First entry should be evicted
    expect(smallCache.get('msg1', 'claude')).toBeNull();
    expect(smallCache.get('msg2', 'claude')).toBeDefined();
    expect(smallCache.get('msg3', 'claude')).toBeDefined();
  });

  it('should clear all cache entries', async () => {
    context.metadata = { originalMessage: 'hello' };
    await middleware.after(result, context);

    expect(middleware.get('hello', 'claude')).toBeDefined();

    middleware.clear();

    expect(middleware.get('hello', 'claude')).toBeNull();
  });

  it('should provide cache statistics', async () => {
    const ctx1 = { ...context, metadata: { originalMessage: 'msg1' } };
    const ctx2 = { ...context, metadata: { originalMessage: 'msg2' } };

    await middleware.after(result, ctx1);
    await middleware.after(result, ctx2);

    middleware.get('msg1', 'claude');
    middleware.get('msg1', 'claude');

    const stats = middleware.getStats();
    expect(stats.size).toBe(2);
    expect(stats.totalHits).toBe(2);
    expect(stats.entries).toHaveLength(2);
  });

  it('should generate same cache key for similar messages', async () => {
    const ctx1 = { ...context, metadata: { originalMessage: 'HELLO' } };

    await middleware.after(result, ctx1);

    // Should all match the same cache key (normalized)
    expect(middleware.get('HELLO', 'claude')).toBeDefined();
    expect(middleware.get('hello', 'claude')).toBeDefined();
    expect(middleware.get('  hello  ', 'claude')).toBeDefined();
  });

  it('should differentiate cache by agent', async () => {
    context.metadata = { originalMessage: 'hello' };

    await middleware.after(result, context);

    expect(middleware.get('hello', 'claude')).toBeDefined();
    expect(middleware.get('hello', 'other-agent')).toBeNull();
  });
});
