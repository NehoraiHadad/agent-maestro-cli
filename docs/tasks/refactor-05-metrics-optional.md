# 📊 Refactor 05: Make MetricsCollector Optional

> **Priority:** MEDIUM
> **Can Run in Parallel:** ✅ YES (with Refactor 04, 06)
> **Estimated Time:** 2-3 hours
> **Status:** 📋 Pending

---

## 🎯 Objective

Make MetricsCollector an **optional feature** that can be disabled. Currently, metrics are collected always, adding complexity to what should be a simple wrapper.

**Before:** MetricsCollector always active, always collecting
**After:** Optional feature controlled by config flag

---

## 📋 Current Problems

1. **Always on:** Metrics collected even when not needed
2. **Performance overhead:** Extra tracking for simple use cases
3. **Memory usage:** Stores execution data unnecessarily
4. **Complexity:** Adds layer to simple wrapper

---

## ✅ Implementation Steps

### Step 1: Add Config Flag

**File:** `src/shared/config/MaestroConfig.ts`

Add to interface:
```typescript
export interface MaestroConfig {
  // ... existing fields ...

  // Metrics (optional feature)
  enableMetrics: boolean; // NEW
}
```

Add to defaults:
```typescript
export const DEFAULT_CONFIG: MaestroConfig = {
  // ... existing defaults ...

  enableMetrics: false, // Disabled by default for simplicity
};
```

### Step 2: Create Null Metrics Collector

**File:** `src/features/monitoring/NullMetricsCollector.ts` (NEW)

```typescript
/**
 * Null Object pattern for MetricsCollector
 * Used when metrics are disabled - does nothing
 */

export class NullMetricsCollector {
  startExecution(_executionId: string): void {
    // No-op
  }

  endExecution(_executionId: string, _success: boolean): void {
    // No-op
  }

  recordEvent(_eventType: string, _data?: Record<string, unknown>): void {
    // No-op
  }

  getSummary(): MetricsSummary {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      executionTimes: [],
    };
  }

  export(): string {
    return JSON.stringify({ enabled: false });
  }

  reset(): void {
    // No-op
  }
}
```

### Step 3: Update Maestro.ts

Replace metrics initialization:

**Before:**
```typescript
this.metricsCollector = new MetricsCollector();
```

**After:**
```typescript
// Use NullMetricsCollector when metrics disabled
this.metricsCollector = this.config.enableMetrics
  ? new MetricsCollector()
  : new NullMetricsCollector();
```

### Step 4: Add CLI Flag

**File:** `src/cli/commands/StartCommand.ts`

Add option:
```typescript
program
  .option('--enable-metrics', 'enable metrics collection')
  // ... other options ...
```

Use in config:
```typescript
const config = createConfig({
  // ... existing config ...
  enableMetrics: options.enableMetrics || false,
});
```

### Step 5: Update Help Messages

**File:** `src/features/ui/session/SessionCommands.ts`

Add metrics command (only if enabled):

```typescript
if (this.maestro.getConfig().enableMetrics) {
  help.push('  /metrics         Show performance metrics');
}
```

### Step 6: Update Tests

**File:** `tests/unit/MetricsCollector.test.ts`

Add tests for NullMetricsCollector:

```typescript
describe('NullMetricsCollector', () => {
  let collector: NullMetricsCollector;

  beforeEach(() => {
    collector = new NullMetricsCollector();
  });

  it('should not track executions', () => {
    collector.startExecution('test-1');
    collector.endExecution('test-1', true);

    const summary = collector.getSummary();
    expect(summary.totalExecutions).toBe(0);
  });

  it('should return empty summary', () => {
    const summary = collector.getSummary();
    expect(summary.totalExecutions).toBe(0);
    expect(summary.successfulExecutions).toBe(0);
  });

  it('should export disabled state', () => {
    const exported = collector.export();
    expect(exported).toContain('enabled');
    expect(exported).toContain('false');
  });
});
```

### Step 7: Update Documentation

**File:** `README.md`

Add metrics section:
```markdown
### Performance Metrics (Optional)

Track execution performance and statistics:

```bash
# Enable metrics collection
maestro --enable-metrics

# View metrics in interactive session
> /metrics
```

**Note:** Metrics are disabled by default for simplicity.
```

---

## 🧪 Testing Requirements

### Must Pass:
```bash
npm test
# All tests must pass including new NullMetricsCollector tests
```

### Manual Tests:

**Test 1: Metrics Disabled (Default)**
```bash
node dist/cli/index.js -m "test message"
# Should work without collecting metrics
```

**Test 2: Metrics Enabled**
```bash
node dist/cli/index.js --enable-metrics -m "test message"
# Should collect and display metrics
```

**Test 3: Interactive Mode**
```bash
node dist/cli/index.js --enable-metrics
> /metrics
# Should show performance stats

node dist/cli/index.js
> /metrics
# Should say "Metrics disabled. Use --enable-metrics to enable."
```

---

## 📝 Files to Modify

1. **NEW:** `src/features/monitoring/NullMetricsCollector.ts`
2. **MODIFY:** `src/shared/config/MaestroConfig.ts`
3. **MODIFY:** `src/features/orchestration/Maestro.ts`
4. **MODIFY:** `src/cli/commands/StartCommand.ts`
5. **MODIFY:** `src/features/ui/session/SessionCommands.ts`
6. **MODIFY:** `tests/unit/MetricsCollector.test.ts`
7. **UPDATE:** `README.md`

**Estimated Changes:**
- +60 lines (NullMetricsCollector)
- +30 lines (config and conditional logic)
- Net: **+90 lines** (but cleaner architecture)

---

## ✅ Completion Checklist

- [ ] Add `enableMetrics` to config
- [ ] Create `NullMetricsCollector.ts`
- [ ] Update `Maestro.ts` to use conditional collector
- [ ] Add `--enable-metrics` CLI flag
- [ ] Update session commands to check flag
- [ ] Write tests for NullMetricsCollector
- [ ] Update README with metrics section
- [ ] Run `npm test` - all pass
- [ ] Run `npm run build` - success
- [ ] Manual testing (enabled and disabled)
- [ ] Commit changes
- [ ] **DELETE THIS FILE**
- [ ] Update `docs/REFACTORING_TASKS.md` status to ✅

---

## 🎯 Success Criteria

- ✅ Metrics disabled by default
- ✅ Can enable with `--enable-metrics` flag
- ✅ NullMetricsCollector provides no-op implementation
- ✅ No performance overhead when disabled
- ✅ All tests pass
- ✅ Documentation updated

---

## 🚨 Important Notes

- **Default Behavior:** Metrics OFF for simplicity
- **Null Object Pattern:** Clean way to handle optional feature
- **Performance:** Zero overhead when disabled
- **Backward Compatibility:** Existing metrics API unchanged

---

**When done, delete this file and update REFACTORING_TASKS.md** ✅
