# Middleware System

The middleware system provides a flexible way to intercept and modify messages and responses in AgentMaestro. Middlewares run in a pipeline with configurable priority and support both `before` (pre-processing) and `after` (post-processing) hooks.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Example Middlewares](#example-middlewares)
- [Best Practices](#best-practices)

## Overview

The middleware system enables you to:

- **Transform messages** before sending to Claude Code
- **Process responses** after receiving from Claude Code
- **Track analytics** and usage metrics
- **Inject context** (system info, project metadata)
- **Cache responses** for repeated queries
- **Filter or validate** content

## Getting Started

### Basic Usage

```typescript
import { Maestro } from 'agent-maestro';
import { AnalyticsMiddleware } from 'agent-maestro/middleware';

// Create Maestro instance
const maestro = Maestro.create();

// Register middleware
const analytics = new AnalyticsMiddleware({ enableLogging: true });
maestro.useMiddleware(analytics);

// Start using Maestro - middleware will run automatically
await maestro.start();
const result = await maestro.sendMessage('Hello, Claude!');
```

### Creating Custom Middleware

```typescript
import { Middleware, MiddlewareContext } from 'agent-maestro/middleware';
import { AgentExecutionResult } from 'agent-maestro';

const loggingMiddleware: Middleware = {
  name: 'logging',
  priority: 10, // Higher runs first

  async before(message: string, context: MiddlewareContext): Promise<string> {
    console.log(`[${context.agent}] Sending:`, message);
    return message; // Return modified or original message
  },

  async after(result: AgentExecutionResult, context: MiddlewareContext): Promise<AgentExecutionResult> {
    console.log(`[${result.agent}] Received:`, result.content.length, 'chars');
    return result; // Return modified or original result
  }
};

maestro.useMiddleware(loggingMiddleware);
```

## Core Concepts

### Middleware Interface

```typescript
interface Middleware {
  /** Unique middleware name */
  name: string;

  /** Optional description */
  description?: string;

  /** Optional priority (higher = runs first, default: 0) */
  priority?: number;

  /** Process message before sending to agent */
  before?(message: string, context: MiddlewareContext): Promise<string>;

  /** Process result after receiving from agent */
  after?(result: AgentExecutionResult, context: MiddlewareContext): Promise<AgentExecutionResult>;
}
```

### Middleware Context

```typescript
interface MiddlewareContext {
  /** Agent name (e.g., 'claude') */
  agent: string;

  /** Session ID if available */
  sessionId?: string;

  /** Timestamp of execution */
  timestamp: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
```

### Execution Order

Middlewares execute in **priority order** (highest first):

```typescript
// Priority: Translation (20) → Context (10) → Analytics (5)
maestro.useMiddleware({ name: 'analytics', priority: 5, before: ... });
maestro.useMiddleware({ name: 'translation', priority: 20, before: ... });
maestro.useMiddleware({ name: 'context', priority: 10, before: ... });

// Execution flow:
// Before hooks: Translation → Context → Analytics
// After hooks: Translation → Context → Analytics
```

### Error Handling

By default, middlewares **continue on error** (errors are logged but don't stop execution):

```typescript
const manager = new MiddlewareManager({
  continueOnError: true, // Default: continue on error
  trackPerformance: true, // Default: track stats
  maxExecutionTime: 5000, // Default: 5 seconds timeout
});
```

## API Reference

### Maestro Methods

#### `useMiddleware(middleware: Middleware): void`

Register a middleware.

```typescript
maestro.useMiddleware({
  name: 'custom',
  before: async (msg) => msg.toUpperCase()
});
```

#### `removeMiddleware(name: string): boolean`

Remove a middleware by name.

```typescript
const removed = maestro.removeMiddleware('custom');
```

#### `getMiddlewareManager(): MiddlewareManager`

Get the middleware manager for advanced configuration.

```typescript
const manager = maestro.getMiddlewareManager();
const stats = manager.getStats();
```

### MiddlewareManager Methods

#### `use(middleware: Middleware): void`

Register a middleware.

#### `remove(name: string): boolean`

Remove a middleware.

#### `getAll(): Middleware[]`

Get all registered middlewares (sorted by priority).

#### `has(name: string): boolean`

Check if middleware exists.

#### `clear(): void`

Remove all middlewares.

#### `getStats(): MiddlewareStats[]`

Get performance statistics for all middlewares.

#### `resetStats(): void`

Reset all statistics.

## Example Middlewares

### AnalyticsMiddleware

Tracks usage metrics and events.

```typescript
import { AnalyticsMiddleware } from 'agent-maestro/middleware';

const analytics = new AnalyticsMiddleware({
  enableLogging: true,
  onEvent: async (event) => {
    // Send to analytics service
    await sendToAnalytics(event);
  }
});

maestro.useMiddleware(analytics);

// Later: Get analytics summary
const summary = analytics.getSummary();
console.log('Total messages:', summary.totalMessages);
console.log('Average response time:', summary.averageResponseTime, 'ms');
```

### ContextInjectionMiddleware

Injects system and project context into messages.

```typescript
import { ContextInjectionMiddleware } from 'agent-maestro/middleware';

const contextInjection = new ContextInjectionMiddleware({
  includeTimestamp: true,
  includeSystem: true,
  includeProject: true,
  customContext: {
    environment: 'production',
    version: '1.0.0'
  }
});

maestro.useMiddleware(contextInjection);

// Messages will be prefixed with:
// [Timestamp: 2025-11-19T10:30:00.000Z]
// [System: linux/x64, Node v20.0.0]
// [Project: my-app (/home/user/my-app)]
// [Context: {"environment":"production","version":"1.0.0"}]
```

### CachingMiddleware

Caches responses for repeated queries.

```typescript
import { CachingMiddleware } from 'agent-maestro/middleware';

const caching = new CachingMiddleware({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100, // Max 100 entries
  enableLogging: true
});

maestro.useMiddleware(caching);

// Check cache before sending (optional - middleware handles this automatically)
const cached = caching.get('What is TypeScript?', 'claude');
if (cached) {
  console.log('Cache hit!');
}

// Get cache statistics
const stats = caching.getStats();
console.log('Cache size:', stats.size);
console.log('Total hits:', stats.totalHits);
```

### TranslationMiddleware

Auto-translates messages (requires translation API integration).

```typescript
import { TranslationMiddleware } from 'agent-maestro/middleware';

const translation = new TranslationMiddleware({
  targetLanguage: 'en',
  sourceLanguage: 'auto', // Auto-detect
  translateResponses: true
});

maestro.useMiddleware(translation);

// Note: This is a stub - integrate with Google Translate API, DeepL, etc.
```

## Best Practices

### 1. Use Priority Wisely

Higher priority = runs first:

```typescript
// Good: Translation happens before analytics
maestro.useMiddleware({ name: 'translation', priority: 20, ... });
maestro.useMiddleware({ name: 'analytics', priority: -10, ... });
```

### 2. Keep Middlewares Focused

Each middleware should do one thing well:

```typescript
// Good: Separate concerns
maestro.useMiddleware(loggingMiddleware);
maestro.useMiddleware(analyticsMiddleware);
maestro.useMiddleware(cachingMiddleware);

// Bad: One middleware doing everything
// ❌ Don't do this
```

### 3. Handle Errors Gracefully

Middlewares should not throw errors that break execution:

```typescript
const safeMiddleware: Middleware = {
  name: 'safe',
  async before(message: string): Promise<string> {
    try {
      return await riskyOperation(message);
    } catch (error) {
      console.warn('Middleware error:', error);
      return message; // Return original on error
    }
  }
};
```

### 4. Optimize Performance

- Use caching for expensive operations
- Set reasonable timeouts
- Track performance with `trackPerformance: true`

```typescript
const manager = new MiddlewareManager({
  maxExecutionTime: 3000, // 3 seconds max per middleware
  trackPerformance: true
});

// Later: Check performance
const stats = manager.getStats();
stats.forEach(s => {
  if (s.averageExecutionTime > 1000) {
    console.warn(`Slow middleware: ${s.name} (${s.averageExecutionTime}ms)`);
  }
});
```

### 5. Document Your Middlewares

Always provide a name and description:

```typescript
const middleware: Middleware = {
  name: 'rate-limiter',
  description: 'Limits requests to 10 per minute',
  priority: 15,
  // ...
};
```

## Advanced Examples

### Chaining Multiple Middlewares

```typescript
import { Maestro } from 'agent-maestro';
import {
  AnalyticsMiddleware,
  ContextInjectionMiddleware,
  CachingMiddleware
} from 'agent-maestro/middleware';

const maestro = Maestro.create();

// 1. Check cache first (highest priority)
maestro.useMiddleware(new CachingMiddleware({
  ttl: 10 * 60 * 1000, // 10 minutes
  priority: 20
}));

// 2. Inject context
maestro.useMiddleware(new ContextInjectionMiddleware({
  includeSystem: true,
  priority: 10
}));

// 3. Track analytics last (lowest priority)
maestro.useMiddleware(new AnalyticsMiddleware({
  enableLogging: true,
  priority: -10
}));

await maestro.start();
```

### Custom Validation Middleware

```typescript
const validationMiddleware: Middleware = {
  name: 'validation',
  priority: 50, // Run first

  async before(message: string): Promise<string> {
    // Validate message length
    if (message.length > 10000) {
      throw new Error('Message too long (max 10000 characters)');
    }

    // Sanitize input
    const sanitized = message
      .replace(/<script>/gi, '')
      .trim();

    return sanitized;
  },

  async after(result: AgentExecutionResult): Promise<AgentExecutionResult> {
    // Validate response
    if (result.exitCode !== 0) {
      console.error('Agent execution failed');
    }

    return result;
  }
};

maestro.useMiddleware(validationMiddleware);
```

### Metrics Collection

```typescript
import { AnalyticsMiddleware } from 'agent-maestro/middleware';

const analytics = new AnalyticsMiddleware({
  enableLogging: false,
  onEvent: async (event) => {
    // Send to monitoring service
    if (event.type === 'response_received') {
      const responseTime = event.metadata?.executionTime as number;

      // Alert if slow
      if (responseTime > 30000) { // 30 seconds
        await sendAlert(`Slow response: ${responseTime}ms`);
      }
    }
  }
});

maestro.useMiddleware(analytics);
```

## Migration Guide

If you're upgrading from a version without middleware:

### Before

```typescript
const maestro = Maestro.create();
await maestro.start();
const result = await maestro.sendMessage('Hello');
// No way to intercept messages
```

### After

```typescript
const maestro = Maestro.create();

// Add middleware
maestro.useMiddleware(new AnalyticsMiddleware());

await maestro.start();
const result = await maestro.sendMessage('Hello');
// Messages are now processed by middleware
```

## Troubleshooting

### Middleware Not Running

Check if middleware is registered:

```typescript
const manager = maestro.getMiddlewareManager();
console.log('Registered:', manager.has('my-middleware'));
```

### Performance Issues

Check middleware statistics:

```typescript
const stats = maestro.getMiddlewareManager().getStats();
stats.forEach(s => {
  console.log(`${s.name}: ${s.averageExecutionTime}ms (${s.errorCount} errors)`);
});
```

### Errors Being Ignored

Change `continueOnError` to `false`:

```typescript
const manager = new MiddlewareManager({
  continueOnError: false // Throw on error
});
```

## See Also

- [Architecture Documentation](./ARCHITECTURE.md)
- [Configuration Guide](./CONFIGURATION.md)
- [API Reference](./API.md)
