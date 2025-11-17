# Task 07: Event Handler Limits

> **Priority:** MEDIUM
> **Estimated Time:** 2-3 hours
> **Files to Modify:**
> - `src/features/execution/pty/PTYEventEmitter.ts`
> - `src/shared/constants/handlers.ts` (new)
> - `tests/unit/PTYEventEmitter.test.ts` (new)

---

## 🎯 Objective

Add maximum listener limits to PTYEventEmitter to prevent memory leaks from unbounded handler arrays.

---

## 📋 Current Problem

PTYEventEmitter allows unlimited event handlers to be registered:

```typescript
// src/features/execution/pty/PTYEventEmitter.ts:40-44
onData(id: string, handler: (data: string) => void): void {
  const handlers = this.handlers.get(id);
  if (handlers) {
    handlers.data.push(handler);  // ⚠️ Unbounded array!
  }
}
```

**Risk:**
- Memory leaks if handlers are not properly cleaned up
- Multiple registrations of the same handler
- Performance degradation with many handlers
- Hard to debug handler-related issues

---

## ✅ Implementation Requirements

### 1. Create Handler Constants

**File:** `src/shared/constants/handlers.ts`

```typescript
/**
 * Event handler configuration constants
 */

/** Maximum number of listeners per event type per process */
export const DEFAULT_MAX_LISTENERS = 10;

/** Whether to warn when approaching max listeners */
export const WARN_ON_LISTENER_THRESHOLD = true;

/** Threshold percentage to trigger warning (e.g., 0.8 = 80%) */
export const LISTENER_WARNING_THRESHOLD = 0.8;
```

### 2. Update PTYEventEmitter

**File:** `src/features/execution/pty/PTYEventEmitter.ts`

```typescript
import {
  DEFAULT_MAX_LISTENERS,
  WARN_ON_LISTENER_THRESHOLD,
  LISTENER_WARNING_THRESHOLD
} from '../../../shared/constants/handlers.js';

export interface ProcessHandlers {
  data: Array<(data: string) => void>;
  exit: Array<(exitCode: number, signal?: number) => void>;
}

export class PTYEventEmitter {
  private handlers: Map<string, ProcessHandlers>;
  private maxListeners: number;

  constructor(maxListeners: number = DEFAULT_MAX_LISTENERS) {
    this.handlers = new Map();
    this.maxListeners = maxListeners;
  }

  /**
   * Initialize handlers for a process
   * @param id - Process identifier
   */
  initializeHandlers(id: string): void {
    this.handlers.set(id, {
      data: [],
      exit: []
    });
  }

  /**
   * Register data handler with limit check
   * @param id - Process identifier
   * @param handler - Data handler function
   * @throws Error if max listeners exceeded
   */
  onData(id: string, handler: (data: string) => void): void {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      throw new Error(`No handlers initialized for process ${id}`);
    }

    // Check limit
    if (handlers.data.length >= this.maxListeners) {
      throw new Error(
        `Maximum listeners (${this.maxListeners}) exceeded for process ${id} data event. ` +
        `This may indicate a memory leak. Current handlers: ${handlers.data.length}`
      );
    }

    // Warn if approaching limit
    if (WARN_ON_LISTENER_THRESHOLD) {
      const threshold = Math.floor(this.maxListeners * LISTENER_WARNING_THRESHOLD);
      if (handlers.data.length >= threshold) {
        console.warn(
          `[PTYEventEmitter] Process ${id} data handlers at ${handlers.data.length}/${this.maxListeners} ` +
          `(${Math.round((handlers.data.length / this.maxListeners) * 100)}%)`
        );
      }
    }

    handlers.data.push(handler);
  }

  /**
   * Register exit handler with limit check
   * @param id - Process identifier
   * @param handler - Exit handler function
   * @throws Error if max listeners exceeded
   */
  onExit(id: string, handler: (exitCode: number, signal?: number) => void): void {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      throw new Error(`No handlers initialized for process ${id}`);
    }

    // Check limit
    if (handlers.exit.length >= this.maxListeners) {
      throw new Error(
        `Maximum listeners (${this.maxListeners}) exceeded for process ${id} exit event. ` +
        `This may indicate a memory leak. Current handlers: ${handlers.exit.length}`
      );
    }

    // Warn if approaching limit
    if (WARN_ON_LISTENER_THRESHOLD) {
      const threshold = Math.floor(this.maxListeners * LISTENER_WARNING_THRESHOLD);
      if (handlers.exit.length >= threshold) {
        console.warn(
          `[PTYEventEmitter] Process ${id} exit handlers at ${handlers.exit.length}/${this.maxListeners}`
        );
      }
    }

    handlers.exit.push(handler);
  }

  /**
   * Remove a specific data handler
   * @param id - Process identifier
   * @param handler - Handler to remove
   * @returns True if handler was found and removed
   */
  removeDataHandler(id: string, handler: (data: string) => void): boolean {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      return false;
    }

    const index = handlers.data.indexOf(handler);
    if (index !== -1) {
      handlers.data.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Remove a specific exit handler
   * @param id - Process identifier
   * @param handler - Handler to remove
   * @returns True if handler was found and removed
   */
  removeExitHandler(
    id: string,
    handler: (exitCode: number, signal?: number) => void
  ): boolean {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      return false;
    }

    const index = handlers.exit.indexOf(handler);
    if (index !== -1) {
      handlers.exit.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Remove all handlers for a process
   * @param id - Process identifier
   */
  removeAllHandlers(id: string): void {
    this.handlers.delete(id);
  }

  /**
   * Get handler statistics
   * @param id - Process identifier
   * @returns Handler stats or null if process not found
   */
  getHandlerStats(id: string): {
    dataHandlers: number;
    exitHandlers: number;
    totalHandlers: number;
    maxListeners: number;
    utilizationPercent: number;
  } | null {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      return null;
    }

    const dataHandlers = handlers.data.length;
    const exitHandlers = handlers.exit.length;
    const totalHandlers = dataHandlers + exitHandlers;
    const utilizationPercent = (Math.max(dataHandlers, exitHandlers) / this.maxListeners) * 100;

    return {
      dataHandlers,
      exitHandlers,
      totalHandlers,
      maxListeners: this.maxListeners,
      utilizationPercent
    };
  }

  /**
   * Get all process IDs with handlers
   * @returns Array of process IDs
   */
  getProcessIds(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get total handler count across all processes
   * @returns Total number of handlers
   */
  getTotalHandlerCount(): number {
    let total = 0;
    for (const handlers of this.handlers.values()) {
      total += handlers.data.length + handlers.exit.length;
    }
    return total;
  }

  /**
   * Check if a process has handlers
   * @param id - Process identifier
   * @returns True if process has handlers
   */
  hasHandlers(id: string): boolean {
    return this.handlers.has(id);
  }

  /**
   * Emit data event to all registered handlers
   * @param id - Process identifier
   * @param data - Data to emit
   */
  emitData(id: string, data: string): void {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      return;
    }

    // Call all handlers (use slice to avoid issues if handler modifies array)
    for (const handler of handlers.data.slice()) {
      try {
        handler(data);
      } catch (error) {
        console.error(`[PTYEventEmitter] Error in data handler for process ${id}:`, error);
      }
    }
  }

  /**
   * Emit exit event to all registered handlers
   * @param id - Process identifier
   * @param exitCode - Exit code
   * @param signal - Signal number (optional)
   */
  emitExit(id: string, exitCode: number, signal?: number): void {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      return;
    }

    // Call all handlers
    for (const handler of handlers.exit.slice()) {
      try {
        handler(exitCode, signal);
      } catch (error) {
        console.error(`[PTYEventEmitter] Error in exit handler for process ${id}:`, error);
      }
    }

    // Clean up handlers after exit
    this.removeAllHandlers(id);
  }
}
```

### 3. Update setupHandlers Method

Update the method that uses PTYEventEmitter to handle errors:

```typescript
setupHandlers(
  id: string,
  process: IPty,
  onData: (data: string) => void,
  onExit: (exitCode: number, signal?: number) => void
): void {
  try {
    // Initialize handlers if not already done
    if (!this.hasHandlers(id)) {
      this.initializeHandlers(id);
    }

    // Register handlers
    this.onData(id, onData);
    this.onExit(id, onExit);

    // Setup actual PTY listeners
    process.onData((data: string) => this.emitData(id, data));
    process.onExit(({ exitCode, signal }) => this.emitExit(id, exitCode, signal));

  } catch (error) {
    console.error(`[PTYEventEmitter] Failed to setup handlers for process ${id}:`, error);
    throw error;
  }
}
```

### 4. Update Constants Export

**File:** `src/shared/constants/index.ts`

```typescript
export * from './agents.js';
export * from './timeouts.js';
export * from './logging.js';
export * from './buffers.js';
export * from './environment.js';
export * from './metrics.js';
export * from './handlers.js'; // Add this
```

### 5. Create Unit Tests

**File:** `tests/unit/PTYEventEmitter.test.ts`

```typescript
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

      const handler = (data: string) => { /* noop */ };
      emitter.onData('test-id', handler);

      const stats = emitter.getHandlerStats('test-id');
      expect(stats?.dataHandlers).toBe(1);
    });

    it('should register exit handlers', () => {
      emitter.initializeHandlers('test-id');

      const handler = (code: number) => { /* noop */ };
      emitter.onExit('test-id', handler);

      const stats = emitter.getHandlerStats('test-id');
      expect(stats?.exitHandlers).toBe(1);
    });

    it('should throw when max data handlers exceeded', () => {
      emitter.initializeHandlers('test-id');

      // Add 3 handlers (max)
      for (let i = 0; i < 3; i++) {
        emitter.onData('test-id', (data) => { /* noop */ });
      }

      // 4th should throw
      expect(() => {
        emitter.onData('test-id', (data) => { /* noop */ });
      }).toThrow(/Maximum listeners.*exceeded/);
    });

    it('should throw when max exit handlers exceeded', () => {
      emitter.initializeHandlers('test-id');

      // Add 3 handlers (max)
      for (let i = 0; i < 3; i++) {
        emitter.onExit('test-id', (code) => { /* noop */ });
      }

      // 4th should throw
      expect(() => {
        emitter.onExit('test-id', (code) => { /* noop */ });
      }).toThrow(/Maximum listeners.*exceeded/);
    });
  });

  describe('Handler Removal', () => {
    it('should remove data handler', () => {
      emitter.initializeHandlers('test-id');

      const handler = (data: string) => { /* noop */ };
      emitter.onData('test-id', handler);

      expect(emitter.removeDataHandler('test-id', handler)).toBe(true);

      const stats = emitter.getHandlerStats('test-id');
      expect(stats?.dataHandlers).toBe(0);
    });

    it('should return false when removing non-existent handler', () => {
      emitter.initializeHandlers('test-id');
      const handler = (data: string) => { /* noop */ };

      expect(emitter.removeDataHandler('test-id', handler)).toBe(false);
    });

    it('should remove all handlers', () => {
      emitter.initializeHandlers('test-id');

      emitter.onData('test-id', (data) => { /* noop */ });
      emitter.onExit('test-id', (code) => { /* noop */ });

      emitter.removeAllHandlers('test-id');

      expect(emitter.hasHandlers('test-id')).toBe(false);
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
      emitter.onExit('test-id', (code) => results.push(code));
      emitter.onExit('test-id', (code) => results.push(code * 2));

      emitter.emitExit('test-id', 1);

      expect(results).toEqual([1, 2]);
    });

    it('should clean up handlers after exit', () => {
      emitter.initializeHandlers('test-id');
      emitter.onData('test-id', (data) => { /* noop */ });
      emitter.onExit('test-id', (code) => { /* noop */ });

      emitter.emitExit('test-id', 0);

      expect(emitter.hasHandlers('test-id')).toBe(false);
    });

    it('should handle errors in handlers gracefully', () => {
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
  });

  describe('Statistics', () => {
    it('should return correct handler stats', () => {
      emitter.initializeHandlers('test-id');

      emitter.onData('test-id', (data) => { /* noop */ });
      emitter.onData('test-id', (data) => { /* noop */ });
      emitter.onExit('test-id', (code) => { /* noop */ });

      const stats = emitter.getHandlerStats('test-id');
      expect(stats).not.toBeNull();
      expect(stats!.dataHandlers).toBe(2);
      expect(stats!.exitHandlers).toBe(1);
      expect(stats!.totalHandlers).toBe(3);
      expect(stats!.maxListeners).toBe(3);
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

      emitter.onData('process-1', (data) => { /* noop */ });
      emitter.onData('process-2', (data) => { /* noop */ });
      emitter.onExit('process-1', (code) => { /* noop */ });

      expect(emitter.getTotalHandlerCount()).toBe(3);
    });
  });
});
```

---

## 🧪 Testing Instructions

1. **Run unit tests:**
   ```bash
   npm run test -- PTYEventEmitter.test.ts
   ```

2. **Test with TypeScript compilation:**
   ```bash
   npm run build
   ```

3. **Test max listener protection:**
   - Try to register more than max listeners
   - Verify error is thrown
   - Check warning messages in console

---

## ✅ Acceptance Criteria

- [ ] Handler constants defined
- [ ] PTYEventEmitter enforces max listener limits
- [ ] Warnings shown when approaching limit
- [ ] Handlers can be removed individually or all at once
- [ ] Statistics provide insights into handler usage
- [ ] Error handling in emitters prevents crashes
- [ ] Cleanup after exit event
- [ ] All unit tests passing (100% coverage)
- [ ] TypeScript compilation successful

---

## 📝 Completion Steps

1. Create handler constants file
2. Update PTYEventEmitter with limits and validation
3. Add handler removal methods
4. Add statistics methods
5. Create comprehensive unit tests
6. Run tests and verify they pass
7. Test manually with multiple handlers
8. Commit changes: `git commit -m "feat: Add event handler limits to prevent memory leaks (Task 07)"`
9. Delete this task file: `rm docs/tasks/task-07-event-handler-limits.md`
10. Update `docs/TASKS_MASTER.md` with completion status

---

## 🔗 Related Tasks

- Task 02: Buffer Memory Leak (similar pattern)
- Task 06: Metrics Rotation (similar pattern)
- Task 08: Comprehensive Test Suite

---

**Let's prevent those memory leaks! 🔌**
