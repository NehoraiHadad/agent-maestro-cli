# TASK-005: Remove Unnecessary Infrastructure

## 📌 Overview
**Priority**: 🟡 MEDIUM
**Status**: ⏳ Pending
**Estimated Time**: 2-3 hours
**Dependencies**: None
**Can Run in Parallel**: Yes (Group A)

---

## 🎯 Goal
Remove infrastructure components that are over-engineered for a simple wrapper: CircuitBreaker, MetricsCollector, TimeoutManager, and RetryManager.

---

## ❌ Problem
These infrastructure components add unnecessary complexity:

1. **CircuitBreaker** (`src/shared/utils/CircuitBreaker.ts`) - 150+ lines
   - Purpose: Prevent cascading failures
   - Problem: Wrapper doesn't need circuit breaking - Claude Code handles its own errors

2. **MetricsCollector** (`src/features/monitoring/MetricsCollector.ts`) - 100+ lines
   - Purpose: Track performance metrics
   - Problem: Too complex for a wrapper - basic logging is enough

3. **TimeoutManager** (`src/features/delegation/TimeoutManager.ts`) - 90 lines
   - Purpose: Manage delegation timeouts
   - Problem: **Not even used!** No imports found

4. **RetryManager** (`src/shared/utils/RetryManager.ts`) - 100+ lines
   - Purpose: Automatic retry with exponential backoff
   - Problem: Wrapper doesn't need retry logic - let Claude fail fast

---

## ✅ Solution
Remove these components and simplify error handling.

---

## 📂 Files to Delete

1. `src/shared/utils/CircuitBreaker.ts`
2. `src/features/monitoring/MetricsCollector.ts`
3. `src/features/monitoring/index.ts` (if only exports MetricsCollector)
4. `src/features/delegation/TimeoutManager.ts`
5. `src/features/delegation/index.ts` (if only exports TimeoutManager)
6. `src/shared/utils/RetryManager.ts`

---

## 📂 Files to Modify

1. `src/domain/repositories/AgentRepository.ts` - Remove CircuitBreaker usage
2. `src/features/orchestration/Maestro.ts` - Remove MetricsCollector
3. `src/features/execution/pty/PTYManager.ts` - Remove RetryManager
4. `src/shared/utils/index.ts` - Remove exports

---

## 🔧 Implementation Steps

### Step 1: Remove TimeoutManager (Not Used)

**Action**: Simply delete the file
```bash
rm src/features/delegation/TimeoutManager.ts

# Check if index.ts only exports TimeoutManager
cat src/features/delegation/index.ts
# If yes, delete it too:
rm src/features/delegation/index.ts
```

**Verify not used**:
```bash
grep -r "TimeoutManager" src/
# Expected: No results (except in index.ts exports)
```

---

### Step 2: Remove CircuitBreaker from AgentRepository

**File**: `src/domain/repositories/AgentRepository.ts`

**Delete (Line 8)**:
```typescript
import { CircuitBreaker } from '../../shared/utils/index.js';
```

**Delete (Line 12)**:
```typescript
private circuitBreakers: Map<AgentName, CircuitBreaker>;
```

**Delete constructor initialization (Line 16)**:
```typescript
this.circuitBreakers = new Map();
```

**Delete methods (Line 146-188)**:
```typescript
// Delete these entire methods:
private getCircuitBreaker(agentName: AgentName): CircuitBreaker { ... }
async executeWithProtection<T>(...): Promise<T> { ... }
getCircuitStats(agentName: AgentName): ... { ... }
resetCircuit(agentName: AgentName): void { ... }
```

**Result**: AgentRepository is now much simpler - just manages agent registry.

---

### Step 3: Remove MetricsCollector from Maestro

**File**: `src/features/orchestration/Maestro.ts`

**Delete (Line 17)**:
```typescript
import { MetricsCollector } from '../monitoring/index.js';
```

**Delete (Line 50)**:
```typescript
private metricsCollector: MetricsCollector;
```

**Delete initialization (Line 95)**:
```typescript
this.metricsCollector = new MetricsCollector();
```

**Delete usage (Line 183)**:
```typescript
const executionId = `exec_${Date.now()}`;
this.metricsCollector.startExecution(executionId);
```

**Delete usage (Line 195, 199)**:
```typescript
this.metricsCollector.endExecution(executionId, result.exitCode === 0);
// ...
this.metricsCollector.endExecution(executionId, false);
```

**Delete methods (Line 276-286)**:
```typescript
// Delete these methods:
getMetrics(): ReturnType<MetricsCollector['getSummary']> { ... }
exportMetrics(): string { ... }
```

**Update getStats() method (Line 258-270)**:
```typescript
// Before:
getStats(): MaestroStats {
  const summary = this.sessionManager.getSummary();
  const metrics = this.metricsCollector.getSummary();

  return {
    totalMessages: summary.messageCount,
    sessionDuration: summary.duration,
    totalExecutions: metrics.totalExecutions,
    successfulExecutions: metrics.successfulExecutions,
    failedExecutions: metrics.failedExecutions,
    averageExecutionTime: metrics.averageExecutionTime
  };
}

// After:
getStats(): MaestroStats {
  const summary = this.sessionManager.getSummary();

  return {
    totalMessages: summary.messageCount,
    sessionDuration: summary.duration
  };
}
```

**Update MaestroStats interface** (same file, Line 26-33):
```typescript
// Before:
export interface MaestroStats {
  totalMessages: number;
  sessionDuration: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
}

// After:
export interface MaestroStats {
  totalMessages: number;
  sessionDuration: number;
}
```

---

### Step 4: Remove RetryManager from PTYManager

**File**: `src/features/execution/pty/PTYManager.ts`

**Delete (Line 10)**:
```typescript
import { RetryManager } from '../../../shared/utils/index.js';
```

**Delete (Line 16)**:
```typescript
private retryManager: RetryManager;
```

**Delete initialization (Line 22)**:
```typescript
this.retryManager = new RetryManager();
```

**Delete method (Line 177-186)**:
```typescript
// Delete entire method:
async isCommandAvailable(command: string): Promise<boolean> {
  return this.retryManager.executeWithRetry(
    () => this.spawner.isCommandAvailable(command),
    {
      maxRetries: 2,
      baseDelay: 500,
      exponential: false
    }
  ).catch(() => false);
}
```

**Replace with simple version**:
```typescript
async isCommandAvailable(command: string): Promise<boolean> {
  try {
    return await this.spawner.isCommandAvailable(command);
  } catch {
    return false;
  }
}
```

---

### Step 5: Delete Infrastructure Files

```bash
# Delete the files
rm src/shared/utils/CircuitBreaker.ts
rm src/shared/utils/RetryManager.ts
rm src/features/monitoring/MetricsCollector.ts
rm src/features/delegation/TimeoutManager.ts

# Check if monitoring folder is empty
ls src/features/monitoring/
# If only index.ts remains and it's empty, delete the folder:
rm -rf src/features/monitoring/

# Same for delegation
ls src/features/delegation/
# If empty or only index.ts, delete:
rm -rf src/features/delegation/
```

---

### Step 6: Update index.ts exports

**File**: `src/shared/utils/index.ts`

**Remove**:
```typescript
export * from './CircuitBreaker.js';
export * from './RetryManager.js';
```

**File**: `src/features/monitoring/index.ts` (if exists)

Delete entire file or remove MetricsCollector export.

---

### Step 7: Update README.md

**File**: `README.md`

**Remove sections about**:
- Performance Metrics
- Circuit Breaker
- Retry Manager

**Around Line 362-379**, delete:
```markdown
## Performance Metrics

AgentMaestro now collects performance metrics automatically:
...
```

---

## ✅ Acceptance Criteria

- [ ] CircuitBreaker.ts deleted
- [ ] MetricsCollector.ts deleted
- [ ] TimeoutManager.ts deleted
- [ ] RetryManager.ts deleted
- [ ] All imports removed
- [ ] All usage removed from Maestro, PTYManager, AgentRepository
- [ ] MaestroStats simplified
- [ ] Tests updated (remove circuit breaker tests)
- [ ] Build succeeds
- [ ] No broken imports

---

## 🔍 Verification

```bash
# Search for any remaining usage
grep -r "CircuitBreaker" src/
grep -r "MetricsCollector" src/
grep -r "TimeoutManager" src/
grep -r "RetryManager" src/

# Expected: No results (except comments)

# Build
npm run build

# Run tests
npm run test

# Check test files
ls tests/unit/
# Delete tests/unit/CircuitBreaker.test.ts if exists
```

---

## 🚨 Rollback Plan

If issues occur:
```bash
git checkout HEAD -- src/shared/utils/CircuitBreaker.ts
git checkout HEAD -- src/shared/utils/RetryManager.ts
git checkout HEAD -- src/features/monitoring/
git checkout HEAD -- src/features/delegation/
git checkout HEAD -- src/features/orchestration/Maestro.ts
git checkout HEAD -- src/domain/repositories/AgentRepository.ts
npm run build
```

---

## 📝 Post-Completion

After completing this task:
1. Update `docs/tasks/STATUS.md`:
   - Change TASK-005 status to ✅ Complete
   - Add completion date to Change Log
   - Note: X files deleted, Y lines removed
2. Delete this file: `docs/tasks/TASK-005-remove-infrastructure.md`
3. Delete test file: `tests/unit/CircuitBreaker.test.ts` (if exists)
4. Commit changes:
```bash
git add .
git commit -m "refactor: remove unnecessary infrastructure (TASK-005)"
```

---

## 💡 Notes

- Can run in parallel with all tasks except TASK-003
- Removes ~400-500 lines of code
- Significantly simplifies the codebase
- Keep basic error handling - just remove complex patterns
- This aligns with wrapper principle: simple and focused
