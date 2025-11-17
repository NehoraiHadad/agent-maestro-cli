# Task 04: Standardize Error Handling

> **Priority:** HIGH
> **Estimated Time:** 4-5 hours
> **Files to Modify:**
> - `src/features/orchestration/Maestro.ts`
> - `src/shared/errors/OrchestrationErrors.ts` (new)
> - `src/shared/errors/index.ts`
> - `tests/unit/OrchestrationErrors.test.ts` (new)

---

## 🎯 Objective

Create a consistent error handling strategy across the codebase with custom error classes, proper error enrichment, and standardized error propagation patterns.

---

## 📋 Current Problem

Error handling in Maestro is inconsistent:

```typescript
// Pattern 1: Catch, log, and reject
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  this.loggingManager.error('Maestro', `Failed: ${errorMsg}`);
  reject(error);
}

// Pattern 2: Just throw
} catch (error) {
  this.metricsCollector.endExecution(executionId, false);
  throw error;
}

// Pattern 3: Silent catch (in StreamProcessor)
} catch (error) {
  return null; // No logging!
}
```

**Problems:**
- Inconsistent error handling makes debugging difficult
- Lost error context across the call stack
- Some errors are silently swallowed
- No standardized way to add execution context to errors

---

## ✅ Implementation Requirements

### 1. Create Orchestration Error Classes

**File:** `src/shared/errors/OrchestrationErrors.ts`

```typescript
import { BaseError } from './BaseError.js';

/**
 * Base error for orchestration-related failures
 */
export class OrchestrationError extends BaseError {
  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super('ORCHESTRATION_ERROR', message, context);
    this.name = 'OrchestrationError';
  }
}

/**
 * Error thrown when agent execution fails
 */
export class AgentExecutionError extends OrchestrationError {
  public readonly agentName: string;
  public readonly exitCode?: number;

  constructor(
    agentName: string,
    message: string,
    exitCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message, {
      ...context,
      agentName,
      exitCode
    });
    this.name = 'AgentExecutionError';
    this.code = 'AGENT_EXECUTION_ERROR';
    this.agentName = agentName;
    this.exitCode = exitCode;
  }
}

/**
 * Error thrown when output processing fails
 */
export class OutputProcessingError extends OrchestrationError {
  public readonly agentName: string;
  public readonly rawOutput?: string;

  constructor(
    agentName: string,
    message: string,
    rawOutput?: string,
    context?: Record<string, unknown>
  ) {
    super(message, {
      ...context,
      agentName,
      outputPreview: rawOutput?.substring(0, 100)
    });
    this.name = 'OutputProcessingError';
    this.code = 'OUTPUT_PROCESSING_ERROR';
    this.agentName = agentName;
    this.rawOutput = rawOutput;
  }
}

/**
 * Error thrown when session management fails
 */
export class SessionError extends OrchestrationError {
  public readonly sessionId?: string;

  constructor(
    message: string,
    sessionId?: string,
    context?: Record<string, unknown>
  ) {
    super(message, {
      ...context,
      sessionId
    });
    this.name = 'SessionError';
    this.code = 'SESSION_ERROR';
    this.sessionId = sessionId;
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends OrchestrationError {
  public readonly validationErrors: string[];

  constructor(
    message: string,
    validationErrors: string[],
    context?: Record<string, unknown>
  ) {
    super(message, {
      ...context,
      validationErrors
    });
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.validationErrors = validationErrors;
  }
}

/**
 * Error thrown when timeout occurs
 */
export class TimeoutError extends OrchestrationError {
  public readonly timeoutMs: number;

  constructor(
    message: string,
    timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super(message, {
      ...context,
      timeoutMs
    });
    this.name = 'TimeoutError';
    this.code = 'TIMEOUT_ERROR';
    this.timeoutMs = timeoutMs;
  }
}
```

### 2. Create Error Enrichment Helper

Add to `src/features/orchestration/Maestro.ts`:

```typescript
/**
 * Enrich error with execution context
 * @param error - Original error
 * @param context - Additional context
 * @returns Enriched error
 */
private enrichError(
  error: unknown,
  context: {
    agent?: string;
    sessionId?: string;
    executionId?: string;
    operation?: string;
  }
): Error {
  // If it's already one of our custom errors, just add context
  if (error instanceof OrchestrationError) {
    error.context = {
      ...error.context,
      ...context
    };
    return error;
  }

  // Convert unknown errors to proper Error objects
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Create appropriate error type based on context
  let enrichedError: Error;

  if (context.operation === 'execution') {
    enrichedError = new AgentExecutionError(
      context.agent || 'unknown',
      message,
      undefined,
      context
    );
  } else if (context.operation === 'output_processing') {
    enrichedError = new OutputProcessingError(
      context.agent || 'unknown',
      message,
      undefined,
      context
    );
  } else if (context.operation === 'session') {
    enrichedError = new SessionError(
      message,
      context.sessionId,
      context
    );
  } else {
    enrichedError = new OrchestrationError(message, context);
  }

  // Preserve original stack trace
  if (stack) {
    enrichedError.stack = stack;
  }

  return enrichedError;
}
```

### 3. Standardize Error Handling in Maestro

Update error handling throughout `Maestro.ts`:

#### In `sendMessage` method:

```typescript
async sendMessage(message: string): Promise<AgentExecutionResult> {
  const executionId = this.metricsCollector.startExecution();

  try {
    // ... validation and execution logic ...

  } catch (error) {
    this.metricsCollector.endExecution(executionId, false);

    // Enrich and re-throw
    const enrichedError = this.enrichError(error, {
      agent: this.primaryAgent.name,
      executionId,
      operation: 'execution'
    });

    this.loggingManager.error(
      'Maestro',
      `Execution failed: ${enrichedError.message}`,
      enrichedError instanceof OrchestrationError ? enrichedError.context : {}
    );

    throw enrichedError;
  }
}
```

#### In output processing:

```typescript
private processOutput(/* ... */): Promise<AgentExecutionResult> {
  return new Promise((resolve, reject) => {
    // ... setup logic ...

    const onComplete = () => {
      try {
        // ... existing completion logic ...
      } catch (error) {
        if (this.spinner) {
          this.spinner.fail(`${this.primaryAgent.displayName}: error`);
        }

        const enrichedError = this.enrichError(error, {
          agent: this.primaryAgent.name,
          sessionId,
          operation: 'output_processing'
        });

        this.loggingManager.error(
          'Maestro',
          `Output processing failed: ${enrichedError.message}`,
          enrichedError instanceof OrchestrationError ? enrichedError.context : {}
        );

        reject(enrichedError);
      }
    };

    // ... rest of the method
  });
}
```

#### In session management:

```typescript
private async manageSession(/* ... */): Promise<void> {
  try {
    // ... existing session logic ...
  } catch (error) {
    const enrichedError = this.enrichError(error, {
      sessionId,
      operation: 'session'
    });

    this.loggingManager.error(
      'Maestro',
      `Session management failed: ${enrichedError.message}`,
      enrichedError instanceof OrchestrationError ? enrichedError.context : {}
    );

    throw enrichedError;
  }
}
```

### 4. Add Error Logging with Debug Info

Add helper method for detailed error logging:

```typescript
/**
 * Log error with full context for debugging
 * @param error - Error to log
 * @param operation - Operation that failed
 */
private logDetailedError(error: Error, operation: string): void {
  const errorInfo: Record<string, unknown> = {
    operation,
    message: error.message,
    name: error.name,
    stack: error.stack,
  };

  if (error instanceof OrchestrationError) {
    errorInfo.code = error.code;
    errorInfo.context = error.context;
  }

  if (error instanceof AgentExecutionError) {
    errorInfo.agentName = error.agentName;
    errorInfo.exitCode = error.exitCode;
  }

  this.loggingManager.error('Maestro', 'Detailed error information:', errorInfo);
}
```

### 5. Update Error Exports

**File:** `src/shared/errors/index.ts`

```typescript
export * from './BaseError.js';
export * from './AgentErrors.js';
export * from './PTYErrors.js';
export * from './ConfigErrors.js';
export * from './OrchestrationErrors.js'; // Add this
```

### 6. Create Unit Tests

**File:** `tests/unit/OrchestrationErrors.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import {
  OrchestrationError,
  AgentExecutionError,
  OutputProcessingError,
  SessionError,
  ValidationError,
  TimeoutError
} from '../../src/shared/errors/OrchestrationErrors.js';

describe('OrchestrationErrors', () => {
  describe('OrchestrationError', () => {
    it('should create error with message', () => {
      const error = new OrchestrationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('OrchestrationError');
      expect(error.code).toBe('ORCHESTRATION_ERROR');
    });

    it('should include context', () => {
      const context = { foo: 'bar', num: 123 };
      const error = new OrchestrationError('Test error', context);
      expect(error.context).toEqual(context);
    });
  });

  describe('AgentExecutionError', () => {
    it('should create error with agent name', () => {
      const error = new AgentExecutionError('claude', 'Execution failed');
      expect(error.message).toBe('Execution failed');
      expect(error.agentName).toBe('claude');
      expect(error.code).toBe('AGENT_EXECUTION_ERROR');
    });

    it('should include exit code', () => {
      const error = new AgentExecutionError('claude', 'Failed', 1);
      expect(error.exitCode).toBe(1);
    });

    it('should include agent name in context', () => {
      const error = new AgentExecutionError('claude', 'Failed');
      expect(error.context?.agentName).toBe('claude');
    });
  });

  describe('OutputProcessingError', () => {
    it('should create error with agent and output', () => {
      const error = new OutputProcessingError(
        'claude',
        'Parse failed',
        'raw output data'
      );
      expect(error.agentName).toBe('claude');
      expect(error.rawOutput).toBe('raw output data');
    });

    it('should truncate output preview in context', () => {
      const longOutput = 'a'.repeat(200);
      const error = new OutputProcessingError('claude', 'Failed', longOutput);
      const preview = error.context?.outputPreview as string;
      expect(preview.length).toBeLessThanOrEqual(100);
    });
  });

  describe('SessionError', () => {
    it('should create error with session ID', () => {
      const error = new SessionError('Session failed', 'session-123');
      expect(error.sessionId).toBe('session-123');
      expect(error.context?.sessionId).toBe('session-123');
    });
  });

  describe('ValidationError', () => {
    it('should create error with validation errors', () => {
      const errors = ['Error 1', 'Error 2'];
      const error = new ValidationError('Validation failed', errors);
      expect(error.validationErrors).toEqual(errors);
      expect(error.context?.validationErrors).toEqual(errors);
    });
  });

  describe('TimeoutError', () => {
    it('should create error with timeout value', () => {
      const error = new TimeoutError('Timed out', 5000);
      expect(error.timeoutMs).toBe(5000);
      expect(error.context?.timeoutMs).toBe(5000);
    });
  });

  describe('Error inheritance', () => {
    it('should be instanceof Error', () => {
      const error = new OrchestrationError('Test');
      expect(error instanceof Error).toBe(true);
    });

    it('should preserve stack trace', () => {
      const error = new AgentExecutionError('claude', 'Failed');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AgentExecutionError');
    });
  });
});
```

---

## 🧪 Testing Instructions

1. **Run unit tests:**
   ```bash
   npm run test -- OrchestrationErrors.test.ts
   ```

2. **Test error propagation:**
   - Trigger various error scenarios
   - Verify errors are properly enriched
   - Check logs contain full context

3. **Manual testing:**
   ```bash
   # Test with invalid input (should throw ValidationError)
   maestro -m ""

   # Test with non-existent command (should throw AgentExecutionError)
   maestro delegate nonexistent "test"
   ```

---

## ✅ Acceptance Criteria

- [ ] All orchestration error classes created
- [ ] Error enrichment helper implemented
- [ ] All catch blocks in Maestro use consistent pattern
- [ ] Errors include proper context
- [ ] Logging shows detailed error information
- [ ] Stack traces are preserved
- [ ] All unit tests passing
- [ ] TypeScript compilation successful
- [ ] Manual testing confirms proper error handling

---

## 📝 Completion Steps

1. Implement all error classes
2. Add error enrichment to Maestro
3. Update all catch blocks for consistency
4. Run all tests and verify they pass
5. Test error scenarios manually
6. Commit changes: `git commit -m "refactor: Standardize error handling across Maestro (Task 04)"`
7. Delete this task file: `rm docs/tasks/task-04-error-handling.md`
8. Update `docs/TASKS_MASTER.md` with completion status

---

## 🔗 Related Tasks

- Task 01: Input Validation (uses ValidationError)
- Task 08: Comprehensive Test Suite

---

**Let's make error handling consistent and debuggable! 🐛**
