# Phase 2: Create Utility Classes 🔧

**Execution Mode:** ✅ **PARALLEL** - All tasks can run simultaneously
**Estimated Time:** ~10 minutes
**Dependencies:** Phase 1 must be completed first

---

## ⚠️ Important Instructions

1. **Run all 5 tasks in PARALLEL** - they are independent
2. After completion, run `npm run build` to verify
3. Update `docs/IMPLEMENTATION_TRACKER.md` when done
4. **DELETE THIS FILE** after all tasks are completed and verified

---

## Task 2.1: Create SessionIdExtractor Class

**New File:** `src/features/orchestration/SessionIdExtractor.ts`

### Create the file with this content:

```typescript
/**
 * SessionIdExtractor.ts
 * Extracts session IDs from CLI output using various patterns
 */

export interface SessionIdPattern {
  name: string;
  regex: RegExp;
}

/**
 * Utility class for extracting session IDs from agent CLI output
 */
export class SessionIdExtractor {
  private readonly patterns: SessionIdPattern[] = [
    {
      name: 'standard',
      regex: /Session ID:\s*([a-zA-Z0-9_-]+)/i
    },
    {
      name: 'alternative',
      regex: /session[_-]id[:\s]+([a-zA-Z0-9_-]+)/i
    },
    {
      name: 'uuid_format',
      regex: /\bsession_([a-zA-Z0-9_-]{8,})\b/i
    }
  ];

  /**
   * Extract session ID from text
   * @param text - Text to search for session ID
   * @returns Extracted session ID or null if not found
   */
  extract(text: string): string | null {
    for (const pattern of this.patterns) {
      const match = text.match(pattern.regex);
      if (match?.[1]) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Add a custom pattern for session ID extraction
   * @param name - Pattern name for debugging
   * @param regex - Regular expression pattern
   */
  addPattern(name: string, regex: RegExp): void {
    this.patterns.push({ name, regex });
  }

  /**
   * Get all registered patterns
   * @returns Array of pattern names and regexes
   */
  getPatterns(): SessionIdPattern[] {
    return [...this.patterns];
  }
}
```

### Also update the index file:

**File:** `src/features/orchestration/index.ts`

Add this export:
```typescript
export { SessionIdExtractor } from './SessionIdExtractor.js';
```

### Why:
Centralizes Session ID extraction logic that's currently duplicated in Maestro.ts.

**Status:** [ ] Completed

---

## Task 2.2: Create TIMEOUTS Constants

**New File:** `src/shared/constants/timeouts.ts`

### Create the file with this content:

```typescript
/**
 * Timeout constants for various operations
 */

export const TIMEOUTS = {
  /** Command availability check timeout (ms) */
  COMMAND_AVAILABILITY_CHECK: 2000,

  /** Default inactivity timeout (ms) */
  DEFAULT_INACTIVITY: 60000,

  /** Graceful shutdown timeout before force kill (ms) */
  GRACEFUL_SHUTDOWN: 5000,

  /** PTY process spawn timeout (ms) */
  PTY_SPAWN: 10000,

  /** Agent execution timeout (ms) */
  AGENT_EXECUTION: 300000, // 5 minutes

  /** Retry backoff base delay (ms) */
  RETRY_BACKOFF_BASE: 1000
} as const;

export type TimeoutKey = keyof typeof TIMEOUTS;
```

### Also update the index file:

**File:** `src/shared/constants/index.ts`

Add this export:
```typescript
export { TIMEOUTS, type TimeoutKey } from './timeouts.js';
```

### Why:
Eliminates magic numbers scattered throughout the codebase.

**Status:** [ ] Completed

---

## Task 2.3: Create RetryManager Class

**New File:** `src/shared/utils/RetryManager.ts`

### Create the file with this content:

```typescript
/**
 * RetryManager.ts
 * Provides retry logic with exponential backoff
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay?: number;
  exponential?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Retry manager with exponential backoff support
 */
export class RetryManager {
  private defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    exponential: true,
    onRetry: () => {}
  };

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === opts.maxRetries) {
          throw new RetryError(
            `Failed after ${opts.maxRetries} attempts`,
            attempt,
            lastError
          );
        }

        opts.onRetry(attempt, lastError);

        const delay = this.calculateDelay(attempt, opts);
        await this.delay(delay);
      }
    }

    throw new RetryError(
      `Failed after ${opts.maxRetries} attempts`,
      opts.maxRetries,
      lastError
    );
  }

  /**
   * Calculate delay for retry attempt
   */
  private calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    const delay = options.exponential
      ? options.baseDelay * Math.pow(2, attempt - 1)
      : options.baseDelay * attempt;

    return Math.min(delay, options.maxDelay);
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Also update the index file:

**File:** `src/shared/utils/index.ts`

Add this export (or create the file if it doesn't exist):
```typescript
export { RetryManager, RetryError, type RetryOptions } from './RetryManager.js';
```

### Why:
Provides automatic retry logic with exponential backoff for resilient operations.

**Status:** [ ] Completed

---

## Task 2.4: Create CircuitBreaker Class

**New File:** `src/shared/utils/CircuitBreaker.ts`

### Create the file with this content:

```typescript
/**
 * CircuitBreaker.ts
 * Implements circuit breaker pattern for fault tolerance
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly state: CircuitState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;

  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout ?? 60000,
      onStateChange: options.onStateChange ?? (() => {})
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN. Next attempt at ${this.nextAttemptTime?.toISOString()}`,
          this.state
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
    nextAttemptTime?: Date;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.transitionTo('CLOSED');
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.transitionTo('CLOSED');
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.successCount = 0;

    if (
      this.state === 'HALF_OPEN' ||
      this.failureCount >= this.options.failureThreshold
    ) {
      this.transitionTo('OPEN');
      this.nextAttemptTime = new Date(Date.now() + this.options.timeout);
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.nextAttemptTime !== undefined &&
      new Date() >= this.nextAttemptTime
    );
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.options.onStateChange(oldState, newState);
  }
}
```

### Also update the index file:

**File:** `src/shared/utils/index.ts`

Add this export:
```typescript
export { CircuitBreaker, CircuitBreakerError, type CircuitState, type CircuitBreakerOptions } from './CircuitBreaker.js';
```

### Why:
Implements circuit breaker pattern to prevent cascading failures.

**Status:** [ ] Completed

---

## Task 2.5: Create ConfigValidationError Class

**New File:** `src/shared/errors/ConfigErrors.ts`

### Create the file with this content:

```typescript
/**
 * Configuration-related errors
 */
import { BaseError } from './BaseError.js';

export class ConfigValidationError extends BaseError {
  constructor(errors: string[]) {
    super(
      `Configuration validation failed: ${errors.join(', ')}`,
      'CONFIG_VALIDATION_ERROR',
      { errors }
    );
  }

  public get errors(): string[] {
    return this.context?.errors as string[];
  }
}
```

### Also update the index file:

**File:** `src/shared/errors/index.ts`

Add this export:
```typescript
export { ConfigValidationError } from './ConfigErrors.js';
```

### Why:
Provides proper error handling for configuration validation failures.

**Status:** [ ] Completed

---

## Post-Completion Checklist

After completing all 5 tasks:

- [ ] Verify all 5 new files created
- [ ] Verify all index.ts files updated with exports
- [ ] Run `npm run clean`
- [ ] Run `npm run build`
- [ ] Verify no TypeScript errors
- [ ] Test imports work:
  ```bash
  # Quick test - this should not error
  npx tsc --noEmit
  ```
- [ ] Update `docs/IMPLEMENTATION_TRACKER.md`:
  - Change Phase 2 status to ✅ Completed
  - Mark all 5 tasks as `[x]`
  - Update "Tasks Completed" to 5/5
- [ ] Commit changes with message: `feat: Phase 2 - Add utility classes (SessionIdExtractor, RetryManager, CircuitBreaker, TIMEOUTS)`
- [ ] **DELETE THIS FILE** (`docs/tasks/phase-2-utilities.md`)

---

## Troubleshooting

### If index.ts doesn't exist:
Create it with the appropriate exports. For example:
```typescript
// src/shared/utils/index.ts
export * from './RetryManager.js';
export * from './CircuitBreaker.js';
```

### If build fails:
1. Check all import paths end with `.js`
2. Verify BaseError exists for ConfigErrors.ts
3. Run `npx tsc --noEmit` to see exact errors

---

**Created:** 2025-01-17
**Phase:** 2 of 6
**Next Phase:** Phase 3 - Architectural Refactoring
