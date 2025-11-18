# TASK-007: Simplify Error Handling

## 📌 Overview
**Priority**: 🟡 MEDIUM
**Status**: ⏳ Pending
**Estimated Time**: 2-3 hours
**Dependencies**: None
**Can Run in Parallel**: Yes (Group A)

---

## 🎯 Goal
Reduce error handling complexity from 6 specialized error types to 2-3 essential types suitable for a simple wrapper.

---

## ❌ Problem

**Current error structure** (`src/shared/errors/`):
```
├── BaseError.ts                 - Base class
├── AgentErrors.ts               - AgentNotFoundError, AgentConfigError
├── PTYErrors.ts                 - PTYSpawnError, PTYWriteError, PTYNotFoundError
├── OrchestrationErrors.ts       - OrchestrationError, AgentExecutionError,
│                                  OutputProcessingError, SessionError
├── ConfigErrors.ts              - ConfigValidationError
└── index.ts
```

**Total**: 10+ error classes for a simple wrapper

**Problem**: Over-engineered error handling adds complexity without value for a wrapper.

---

## ✅ Solution

**Simplified structure** (2-3 error types):
```
├── BaseError.ts                 - Base class
├── MaestroError.ts              - General maestro errors
├── AgentError.ts                - Agent-related errors (spawn, execution)
└── index.ts
```

**Total**: 3 error classes (Base + 2 specific)

---

## 📂 Files to Modify/Delete

### Keep & Simplify:
1. `src/shared/errors/BaseError.ts` - Keep as is (good base class)
2. `src/shared/errors/index.ts` - Update exports

### Create New:
1. `src/shared/errors/MaestroError.ts` - General errors
2. `src/shared/errors/AgentError.ts` - Agent-related errors

### Delete:
1. `src/shared/errors/AgentErrors.ts` - Replace with AgentError
2. `src/shared/errors/PTYErrors.ts` - Merge into AgentError
3. `src/shared/errors/OrchestrationErrors.ts` - Replace with MaestroError
4. `src/shared/errors/ConfigErrors.ts` - Merge into MaestroError

---

## 🔧 Implementation Steps

### Step 1: Create MaestroError.ts

**File**: `src/shared/errors/MaestroError.ts`

```typescript
/**
 * MaestroError - General error for AgentMaestro operations
 * Covers configuration, orchestration, and general failures
 */

import { BaseError } from './BaseError.js';

export class MaestroError extends BaseError {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'MAESTRO_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MaestroError';
    this.code = code;
    this.context = context;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MaestroError);
    }
  }

  /**
   * Get formatted error details for logging
   */
  getDetails(): string {
    let details = `[${this.code}] ${this.message}`;
    if (this.context) {
      details += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }
    return details;
  }
}
```

---

### Step 2: Create AgentError.ts

**File**: `src/shared/errors/AgentError.ts`

```typescript
/**
 * AgentError - Errors related to agent operations
 * Covers spawn failures, execution errors, and process issues
 */

import { BaseError } from './BaseError.js';

export class AgentError extends BaseError {
  public readonly agentName: string;
  public readonly code: string;
  public readonly exitCode?: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    agentName: string,
    message: string,
    code: string = 'AGENT_ERROR',
    exitCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentError';
    this.agentName = agentName;
    this.code = code;
    this.exitCode = exitCode;
    this.context = context;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AgentError);
    }
  }

  /**
   * Get formatted error details for logging
   */
  getDetails(): string {
    let details = `[${this.code}] Agent: ${this.agentName} - ${this.message}`;
    if (this.exitCode !== undefined) {
      details += `\nExit Code: ${this.exitCode}`;
    }
    if (this.context) {
      details += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }
    return details;
  }
}
```

---

### Step 3: Update index.ts

**File**: `src/shared/errors/index.ts`

```typescript
// Before:
export * from './BaseError.js';
export * from './AgentErrors.js';
export * from './PTYErrors.js';
export * from './OrchestrationErrors.js';
export * from './ConfigErrors.js';

// After:
export * from './BaseError.js';
export * from './MaestroError.js';
export * from './AgentError.js';
```

---

### Step 4: Update Maestro.ts

**File**: `src/features/orchestration/Maestro.ts`

**Update imports (Line 19-24)**:
```typescript
// Before:
import {
  OrchestrationError,
  AgentExecutionError,
  OutputProcessingError,
  SessionError
} from '../../shared/errors/OrchestrationErrors.js';

// After:
import {
  MaestroError,
  AgentError
} from '../../shared/errors/index.js';
```

**Update enrichError method (Line 297-355)**:
```typescript
private enrichError(
  error: unknown,
  context: {
    agent?: string;
    sessionId?: string;
    executionId?: string;
    operation?: string;
  }
): Error {
  // If it's already one of our errors, return as-is
  if (error instanceof MaestroError || error instanceof AgentError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  let enrichedError: Error;

  // Determine error type based on context
  if (context.agent) {
    // Agent-related error
    enrichedError = new AgentError(
      context.agent,
      message,
      'AGENT_ERROR',
      undefined,
      { ...context }
    );
  } else {
    // General maestro error
    enrichedError = new MaestroError(
      message,
      'MAESTRO_ERROR',
      { ...context }
    );
  }

  // Preserve stack trace
  if (stack) {
    enrichedError.stack = stack;
  }

  return enrichedError;
}
```

**Update logDetailedError method (Line 362-382)**:
```typescript
private logDetailedError(error: Error, operation: string): void {
  const errorInfo: Record<string, unknown> = {
    operation,
    message: error.message,
    name: error.name,
    stack: error.stack,
  };

  if (error instanceof AgentError) {
    errorInfo.code = error.code;
    errorInfo.agentName = error.agentName;
    errorInfo.exitCode = error.exitCode;
    errorInfo.context = error.context;
  } else if (error instanceof MaestroError) {
    errorInfo.code = error.code;
    errorInfo.context = error.context;
  }

  this.loggingManager.error('Maestro', 'Detailed error information:', errorInfo);
}
```

**Update error checks (Line 211, 542)**:
```typescript
// Before:
enrichedError instanceof OrchestrationError ? enrichedError.context : {}

// After:
enrichedError instanceof MaestroError || enrichedError instanceof AgentError
  ? (enrichedError as MaestroError | AgentError).context
  : {}
```

---

### Step 5: Update AgentRepository.ts

**File**: `src/domain/repositories/AgentRepository.ts`

**Update imports (Line 6)**:
```typescript
// Before:
import { AgentNotFoundError } from '../../shared/errors/index.js';

// After:
import { MaestroError } from '../../shared/errors/index.js';
```

**Update findByName method (Line 105-111)**:
```typescript
findByName(name: string): Agent {
  const agent = this.agents.get(name as AgentName);
  if (!agent) {
    throw new MaestroError(
      `Agent '${name}' not found`,
      'AGENT_NOT_FOUND',
      { agentName: name }
    );
  }
  return agent;
}
```

---

### Step 6: Update Agent.ts

**File**: `src/domain/entities/Agent.ts`

**Update imports (Line 5)**:
```typescript
// Before:
import { AgentConfigError } from '../../shared/errors/index.js';

// After:
import { MaestroError } from '../../shared/errors/index.js';
```

**Update validate method (Line 37-50)**:
```typescript
private validate(config: AgentType): void {
  if (!config.name || !config.command) {
    throw new MaestroError(
      'Missing required fields: name and command',
      'AGENT_CONFIG_ERROR',
      { agentName: config.name || 'unknown' }
    );
  }

  if (!config.flags?.prompt) {
    throw new MaestroError(
      'Missing prompt flag configuration',
      'AGENT_CONFIG_ERROR',
      { agentName: config.name }
    );
  }
}
```

---

### Step 7: Update PTYManager.ts

**File**: `src/features/execution/pty/PTYManager.ts`

**Update imports (Line 9)**:
```typescript
// Before:
import { PTYWriteError } from '../../../shared/errors/index.js';

// After:
import { AgentError } from '../../../shared/errors/index.js';
```

**Update write method (Line 70-84)**:
```typescript
write(id: string, data: string): void {
  const info = this.lifecycle.get(id);

  if (!this.lifecycle.isRunning(id)) {
    throw new AgentError(
      id,
      'Process is not running',
      'PTY_WRITE_ERROR'
    );
  }

  try {
    const ptyProcess = info.process as IPty;
    ptyProcess.write(data);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new AgentError(
      id,
      `Write failed: ${reason}`,
      'PTY_WRITE_ERROR'
    );
  }
}
```

---

### Step 8: Update PTYSpawner.ts

**File**: `src/features/execution/pty/PTYSpawner.ts`

**Update imports**:
```typescript
// Before:
import { PTYSpawnError } from '../../../shared/errors/index.js';

// After:
import { AgentError } from '../../../shared/errors/index.js';
```

**Update spawn method**:
```typescript
// Replace PTYSpawnError with AgentError
throw new AgentError(
  command,
  `Failed to spawn process: ${reason}`,
  'PTY_SPAWN_ERROR'
);
```

---

### Step 9: Update PTYLifecycle.ts

**File**: `src/features/execution/pty/PTYLifecycle.ts`

**Update imports**:
```typescript
// Before:
import { PTYNotFoundError } from '../../../shared/errors/index.js';

// After:
import { AgentError } from '../../../shared/errors/index.js';
```

**Update get method**:
```typescript
// Replace PTYNotFoundError with AgentError
throw new AgentError(
  id,
  'PTY process not found',
  'PTY_NOT_FOUND'
);
```

---

### Step 10: Delete Old Error Files

```bash
rm src/shared/errors/AgentErrors.ts
rm src/shared/errors/PTYErrors.ts
rm src/shared/errors/OrchestrationErrors.ts
rm src/shared/errors/ConfigErrors.ts
```

---

### Step 11: Update Tests

**Delete old error tests**:
```bash
rm tests/unit/ErrorClasses.test.ts  # If it tests old error classes
```

**Create new test** (optional):
```typescript
// tests/unit/Errors.test.ts
import { describe, test, expect } from '@jest/globals';
import { MaestroError, AgentError } from '../../src/shared/errors/index.js';

describe('Error Handling', () => {
  test('MaestroError includes context', () => {
    const error = new MaestroError('Test error', 'TEST_CODE', { key: 'value' });
    expect(error.code).toBe('TEST_CODE');
    expect(error.context).toEqual({ key: 'value' });
  });

  test('AgentError includes agent name', () => {
    const error = new AgentError('claude', 'Test error', 'TEST_CODE');
    expect(error.agentName).toBe('claude');
  });
});
```

---

## ✅ Acceptance Criteria

- [ ] Only 3 error files: BaseError.ts, MaestroError.ts, AgentError.ts
- [ ] All usages updated (Maestro, PTYManager, AgentRepository, etc.)
- [ ] Old error files deleted
- [ ] index.ts exports updated
- [ ] Tests updated
- [ ] Build succeeds
- [ ] All tests pass

---

## 🔍 Verification

```bash
# Check error files
ls src/shared/errors/
# Expected: BaseError.ts, MaestroError.ts, AgentError.ts, index.ts

# Search for old error imports
grep -r "OrchestrationError" src/
grep -r "PTYSpawnError" src/
grep -r "AgentConfigError" src/
# Expected: No results

# Build and test
npm run build
npm run test
```

---

## 🚨 Rollback Plan

If issues occur:
```bash
git checkout HEAD -- src/shared/errors/
git checkout HEAD -- src/features/orchestration/Maestro.ts
git checkout HEAD -- src/domain/
git checkout HEAD -- src/features/execution/pty/
npm run build
```

---

## 📝 Post-Completion

After completing this task:
1. Update `docs/tasks/STATUS.md`:
   - Change TASK-007 status to ✅ Complete
   - Add completion date to Change Log
   - Note: 10+ error classes → 3 error classes
2. Delete this file: `docs/tasks/TASK-007-simplify-error-handling.md`
3. Commit changes:
```bash
git add .
git commit -m "refactor: simplify error handling (TASK-007)"
```

---

## 💡 Notes

- Can run in parallel with all tasks
- Reduces cognitive load when handling errors
- Maintains proper error context for debugging
- Keep error codes for better logging/monitoring
- This aligns with wrapper principle: simple and focused
