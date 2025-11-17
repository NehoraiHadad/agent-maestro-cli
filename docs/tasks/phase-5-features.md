# Phase 5: New Features 🚀

**Execution Mode:** ✅ **PARALLEL** - All tasks can run simultaneously
**Estimated Time:** ~10 minutes
**Dependencies:** Phase 3 must be completed first

---

## ⚠️ Important Instructions

1. **Run all 4 tasks in PARALLEL** - they are independent
2. After completion, run `npm run build` to verify
3. Update `docs/IMPLEMENTATION_TRACKER.md` when done
4. **DELETE THIS FILE** after all tasks are completed and verified

---

## Task 5.1: Integrate RetryManager in PTYManager

**File:** `src/features/execution/pty/PTYManager.ts`

### Step 1: Add imports at top

```typescript
import { RetryManager } from '../../../shared/utils/index.js';
import { TIMEOUTS } from '../../../shared/constants/index.js';
```

### Step 2: Add property (after line 14)

```typescript
private retryManager: RetryManager;
```

### Step 3: Initialize in constructor (after line 19)

```typescript
this.retryManager = new RetryManager();
```

### Step 4: Update isCommandAvailable (lines 148-150)

Replace:
```typescript
async isCommandAvailable(command: string): Promise<boolean> {
  return this.spawner.isCommandAvailable(command);
}
```

With:
```typescript
/**
 * Check command availability with retry logic
 */
async isCommandAvailable(command: string): Promise<boolean> {
  return this.retryManager.executeWithRetry(
    () => this.spawner.isCommandAvailable(command),
    {
      maxRetries: 2,
      baseDelay: 500,
      exponential: false
    }
  ).catch(() => false); // Return false if all retries fail
}
```

### Why:
Adds automatic retry for command availability checks, making the system more resilient to transient failures.

### Verification:
- [ ] RetryManager and TIMEOUTS imported
- [ ] retryManager property added
- [ ] Initialized in constructor
- [ ] isCommandAvailable uses retry logic
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Task 5.2: Integrate CircuitBreaker in AgentRepository

**File:** `src/domain/repositories/AgentRepository.ts`

### Step 1: Add import at top

```typescript
import { CircuitBreaker } from '../../shared/utils/index.js';
```

### Step 2: Add property (after line 10)

```typescript
private circuitBreakers: Map<AgentName, CircuitBreaker>;
```

### Step 3: Initialize in constructor (after line 14)

```typescript
this.circuitBreakers = new Map();
```

### Step 4: Add new methods at the end of the class (before closing brace)

```typescript
/**
 * Get or create circuit breaker for agent
 */
private getCircuitBreaker(agentName: AgentName): CircuitBreaker {
  if (!this.circuitBreakers.has(agentName)) {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000,
      onStateChange: (oldState, newState) => {
        console.warn(`[AgentRepository] Circuit breaker for ${agentName}: ${oldState} -> ${newState}`);
      }
    });
    this.circuitBreakers.set(agentName, breaker);
  }
  return this.circuitBreakers.get(agentName)!;
}

/**
 * Execute agent operation with circuit breaker protection
 */
async executeWithProtection<T>(
  agentName: AgentName,
  operation: () => Promise<T>
): Promise<T> {
  const breaker = this.getCircuitBreaker(agentName);
  return breaker.execute(operation);
}

/**
 * Get circuit breaker stats for an agent
 */
getCircuitStats(agentName: AgentName): ReturnType<CircuitBreaker['getStats']> | null {
  const breaker = this.circuitBreakers.get(agentName);
  return breaker ? breaker.getStats() : null;
}

/**
 * Reset circuit breaker for an agent
 */
resetCircuit(agentName: AgentName): void {
  const breaker = this.circuitBreakers.get(agentName);
  if (breaker) {
    breaker.reset();
  }
}
```

### Why:
Implements circuit breaker pattern to prevent cascading failures when an agent repeatedly fails.

### Note:
These methods are available for future use. They're not yet integrated into the execution flow, but provide the infrastructure for circuit breaker protection.

### Verification:
- [ ] CircuitBreaker imported
- [ ] circuitBreakers Map property added
- [ ] Initialized in constructor
- [ ] All 4 new methods added
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Task 5.3: Create MetricsCollector Class

**New File:** `src/features/monitoring/MetricsCollector.ts`

### Step 1: Create the directory

```bash
mkdir -p src/features/monitoring
```

### Step 2: Create the file with this content:

```typescript
/**
 * MetricsCollector.ts
 * Collects and tracks performance metrics
 */

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface MetricsSummary {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  uptime: number;
}

/**
 * Collects performance and operational metrics
 */
export class MetricsCollector {
  private metrics: Metric[] = [];
  private executionTimes: Map<string, number> = new Map();
  private startTime: Date = new Date();

  private counters = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalExecutionTime: 0
  };

  /**
   * Record a metric
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      timestamp: new Date(),
      tags
    });
  }

  /**
   * Start timing an execution
   */
  startExecution(executionId: string): void {
    this.executionTimes.set(executionId, Date.now());
    this.counters.totalExecutions++;
  }

  /**
   * End timing an execution and record success
   */
  endExecution(executionId: string, success: boolean = true): void {
    const startTime = this.executionTimes.get(executionId);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    this.counters.totalExecutionTime += duration;

    if (success) {
      this.counters.successfulExecutions++;
    } else {
      this.counters.failedExecutions++;
    }

    this.record('execution_time', duration, {
      executionId,
      success: success.toString()
    });

    this.executionTimes.delete(executionId);
  }

  /**
   * Get metrics summary
   */
  getSummary(): MetricsSummary {
    const avgTime = this.counters.totalExecutions > 0
      ? this.counters.totalExecutionTime / this.counters.totalExecutions
      : 0;

    return {
      totalExecutions: this.counters.totalExecutions,
      successfulExecutions: this.counters.successfulExecutions,
      failedExecutions: this.counters.failedExecutions,
      averageExecutionTime: Math.round(avgTime),
      totalExecutionTime: this.counters.totalExecutionTime,
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  /**
   * Get all metrics
   */
  getMetrics(name?: string): Metric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.executionTimes.clear();
    this.counters = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutionTime: 0
    };
    this.startTime = new Date();
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify({
      summary: this.getSummary(),
      metrics: this.metrics
    }, null, 2);
  }
}
```

### Step 3: Create index.ts

**File:** `src/features/monitoring/index.ts`

```typescript
export { MetricsCollector, type Metric, type MetricsSummary } from './MetricsCollector.js';
```

### Why:
Provides infrastructure for tracking performance metrics and execution statistics.

### Verification:
- [ ] Directory `src/features/monitoring` created
- [ ] MetricsCollector.ts created
- [ ] index.ts created with exports
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Task 5.4: Integrate MetricsCollector in Maestro

**File:** `src/features/orchestration/Maestro.ts`

### Step 1: Add import at top

```typescript
import { MetricsCollector } from '../monitoring/index.js';
```

### Step 2: Add property (after line 36)

```typescript
private metricsCollector: MetricsCollector;
```

### Step 3: Initialize in constructor

Add after the SessionIdExtractor initialization:
```typescript
this.metricsCollector = new MetricsCollector();
```

### Step 4: Wrap sendMessage with metrics tracking

Replace the `sendMessage` method (starting at line 98):

```typescript
/**
 * Send a message to the primary agent
 * @param message - User message
 * @returns Agent execution result
 */
async sendMessage(message: string): Promise<AgentExecutionResult> {
  if (!this.isRunning) {
    throw new Error('Maestro is not running. Call start() first.');
  }

  const executionId = `exec_${Date.now()}`;
  this.metricsCollector.startExecution(executionId);

  try {
    // Log user message
    this.loggingManager.logUserMessage(message);

    // Add user message to session
    this.sessionManager.addUserMessage(message);

    // Execute primary agent
    const result = await this.executePrimaryAgent(message);

    this.metricsCollector.endExecution(executionId, result.exitCode === 0);

    return result;
  } catch (error) {
    this.metricsCollector.endExecution(executionId, false);
    throw error;
  }
}
```

### Step 5: Add new public methods for metrics access

Add these methods before the closing brace of the class:

```typescript
/**
 * Get performance metrics
 * @returns Metrics summary with execution statistics
 */
getMetrics(): ReturnType<MetricsCollector['getSummary']> {
  return this.metricsCollector.getSummary();
}

/**
 * Export metrics as JSON
 * @returns JSON string with all collected metrics
 */
exportMetrics(): string {
  return this.metricsCollector.export();
}
```

### Step 6: Update getStats method (lines 145-151)

Replace:
```typescript
getStats(): MaestroStats {
  const summary = this.sessionManager.getSummary();
  return {
    totalMessages: summary.messageCount,
    sessionDuration: summary.duration
  };
}
```

With:
```typescript
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
```

### Step 7: Update MaestroStats interface (lines 17-20)

Replace:
```typescript
export interface MaestroStats {
  totalMessages: number;
  sessionDuration: number;
}
```

With:
```typescript
export interface MaestroStats {
  totalMessages: number;
  sessionDuration: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
}
```

### Why:
Enables performance tracking and provides insights into execution patterns.

### Verification:
- [ ] MetricsCollector imported
- [ ] metricsCollector property added
- [ ] Initialized in constructor
- [ ] sendMessage wrapped with metrics tracking
- [ ] getMetrics() and exportMetrics() methods added
- [ ] getStats() includes metrics
- [ ] MaestroStats interface updated
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Post-Completion Checklist

After completing all 4 tasks:

- [ ] All 4 tasks marked as completed
- [ ] Run `npm run clean`
- [ ] Run `npm run build`
- [ ] Verify no TypeScript errors
- [ ] Quick test:
  ```bash
  node dist/cli/index.js --help
  ```
- [ ] Update `docs/IMPLEMENTATION_TRACKER.md`:
  - Change Phase 5 status to ✅ Completed
  - Mark all 4 tasks as `[x]`
  - Update "Tasks Completed" to 4/4
- [ ] Commit changes with message: `feat: Phase 5 - Add new features (RetryManager, CircuitBreaker, MetricsCollector)`
- [ ] **DELETE THIS FILE** (`docs/tasks/phase-5-features.md`)

---

## Troubleshooting

### If monitoring directory creation fails:
```bash
mkdir -p src/features/monitoring
```

### If imports fail:
- Check that Phase 2 utilities are built
- Verify index.ts files exist for exports

### If metrics integration breaks:
- Ensure MetricsCollector class is created first (Task 5.3)
- Check import path: `../monitoring/index.js`

---

**Created:** 2025-01-17
**Phase:** 5 of 6
**Can run in parallel with:** Phase 4
