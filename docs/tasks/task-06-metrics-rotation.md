# Task 06: Metrics Collection with Rotation

> **Priority:** MEDIUM
> **Estimated Time:** 2-3 hours
> **Files to Modify:**
> - `src/features/monitoring/MetricsCollector.ts`
> - `src/shared/constants/metrics.ts` (new)
> - `tests/unit/MetricsCollector.test.ts` (new)

---

## 🎯 Objective

Add bounded metrics collection with automatic rotation to prevent unbounded memory growth when collecting performance metrics.

---

## 📋 Current Problem

MetricsCollector stores all metrics in memory without any limits:

```typescript
// src/features/monitoring/MetricsCollector.ts:40-46
record(name: string, value: number, tags?: Record<string, string>): void {
  this.metrics.push({
    name,
    value,
    timestamp: new Date(),
    tags
  });
}
```

**Risk:**
- Long-running processes accumulate unlimited metrics
- Memory consumption grows unbounded
- No way to limit historical data retention

---

## ✅ Implementation Requirements

### 1. Create Metrics Constants

**File:** `src/shared/constants/metrics.ts`

```typescript
/**
 * Metrics collection configuration constants
 */

/** Maximum number of metrics to keep in memory */
export const DEFAULT_MAX_METRICS = 10000;

/** When max is reached, trim to this percentage of max */
export const METRICS_TRIM_TO_PERCENTAGE = 0.5;

/** Time window for metrics aggregation (in milliseconds) */
export const METRICS_AGGREGATION_WINDOW = 60000; // 1 minute

/** Number of buckets for time-series aggregation */
export const METRICS_TIME_BUCKETS = 100;
```

### 2. Update MetricsCollector

**File:** `src/features/monitoring/MetricsCollector.ts`

```typescript
import {
  DEFAULT_MAX_METRICS,
  METRICS_TRIM_TO_PERCENTAGE,
  METRICS_AGGREGATION_WINDOW
} from '../../shared/constants/metrics.js';

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface AggregatedMetric {
  name: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  timestamp: Date;
}

export class MetricsCollector {
  private metrics: Metric[] = [];
  private maxMetrics: number;
  private rotationCount: number = 0;

  constructor(maxMetrics: number = DEFAULT_MAX_METRICS) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Record a metric with automatic rotation
   * @param name - Metric name
   * @param value - Metric value
   * @param tags - Optional tags for categorization
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      timestamp: new Date(),
      tags
    });

    // Check if rotation is needed
    if (this.metrics.length >= this.maxMetrics) {
      this.rotateMetrics();
    }
  }

  /**
   * Rotate metrics by removing oldest entries
   * @private
   */
  private rotateMetrics(): void {
    const targetSize = Math.floor(this.maxMetrics * METRICS_TRIM_TO_PERCENTAGE);
    const removeCount = this.metrics.length - targetSize;

    // Remove oldest metrics
    this.metrics = this.metrics.slice(removeCount);

    this.rotationCount++;

    console.log(
      `[MetricsCollector] Rotated metrics: removed ${removeCount} oldest entries ` +
      `(rotation #${this.rotationCount})`
    );
  }

  /**
   * Get aggregated metrics for a specific metric name
   * @param name - Metric name to aggregate
   * @param timeWindow - Time window in milliseconds (default: 1 minute)
   * @returns Aggregated metrics or null if no data
   */
  getAggregated(
    name: string,
    timeWindow: number = METRICS_AGGREGATION_WINDOW
  ): AggregatedMetric | null {
    const cutoffTime = new Date(Date.now() - timeWindow);

    const relevantMetrics = this.metrics.filter(
      m => m.name === name && m.timestamp >= cutoffTime
    );

    if (relevantMetrics.length === 0) {
      return null;
    }

    const values = relevantMetrics.map(m => m.value);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      name,
      count: values.length,
      sum,
      avg,
      min,
      max,
      timestamp: new Date()
    };
  }

  /**
   * Get all unique metric names
   * @returns Array of unique metric names
   */
  getMetricNames(): string[] {
    const names = new Set<string>();
    for (const metric of this.metrics) {
      names.add(metric.name);
    }
    return Array.from(names);
  }

  /**
   * Get metrics by tag
   * @param tagKey - Tag key to filter by
   * @param tagValue - Tag value to filter by
   * @returns Filtered metrics
   */
  getMetricsByTag(tagKey: string, tagValue: string): Metric[] {
    return this.metrics.filter(
      m => m.tags && m.tags[tagKey] === tagValue
    );
  }

  /**
   * Get metrics statistics
   * @returns Statistics about the metrics collection
   */
  getStats(): {
    totalMetrics: number;
    maxMetrics: number;
    utilizationPercent: number;
    rotationCount: number;
    oldestMetric?: Date;
    newestMetric?: Date;
  } {
    const utilizationPercent = (this.metrics.length / this.maxMetrics) * 100;

    let oldestMetric: Date | undefined;
    let newestMetric: Date | undefined;

    if (this.metrics.length > 0) {
      oldestMetric = this.metrics[0].timestamp;
      newestMetric = this.metrics[this.metrics.length - 1].timestamp;
    }

    return {
      totalMetrics: this.metrics.length,
      maxMetrics: this.maxMetrics,
      utilizationPercent,
      rotationCount: this.rotationCount,
      oldestMetric,
      newestMetric
    };
  }

  /**
   * Export metrics to JSON
   * @param includeAll - If true, export all metrics; if false, only recent
   * @returns JSON string of metrics
   */
  export(includeAll: boolean = false): string {
    const metricsToExport = includeAll
      ? this.metrics
      : this.metrics.slice(-1000); // Last 1000 metrics

    const exportData = {
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      metrics: metricsToExport,
      aggregated: this.getAggregatedSummary()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get aggregated summary for all metric names
   * @returns Map of metric names to aggregated data
   */
  private getAggregatedSummary(): Record<string, AggregatedMetric> {
    const summary: Record<string, AggregatedMetric> = {};
    const names = this.getMetricNames();

    for (const name of names) {
      const aggregated = this.getAggregated(name);
      if (aggregated) {
        summary[name] = aggregated;
      }
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.rotationCount = 0;
  }

  /**
   * Get raw metrics (for testing/debugging)
   * @returns Array of all metrics
   */
  getMetrics(): readonly Metric[] {
    return [...this.metrics];
  }
}
```

### 3. Update Constants Export

**File:** `src/shared/constants/index.ts`

```typescript
export * from './agents.js';
export * from './timeouts.js';
export * from './logging.js';
export * from './buffers.js';
export * from './environment.js';
export * from './metrics.js'; // Add this
```

### 4. Create Unit Tests

**File:** `tests/unit/MetricsCollector.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { MetricsCollector } from '../../src/features/monitoring/MetricsCollector.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector(100); // Small max for testing
  });

  describe('record', () => {
    it('should record metrics', () => {
      collector.record('test.metric', 42);
      const metrics = collector.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].name).toBe('test.metric');
      expect(metrics[0].value).toBe(42);
    });

    it('should record metrics with tags', () => {
      collector.record('test.metric', 42, { env: 'test', region: 'us-east' });
      const metrics = collector.getMetrics();
      expect(metrics[0].tags).toEqual({ env: 'test', region: 'us-east' });
    });

    it('should include timestamp', () => {
      const before = new Date();
      collector.record('test.metric', 42);
      const after = new Date();

      const metrics = collector.getMetrics();
      expect(metrics[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(metrics[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('rotation', () => {
    it('should rotate metrics when max is reached', () => {
      // Add 150 metrics (max is 100)
      for (let i = 0; i < 150; i++) {
        collector.record('test.metric', i);
      }

      const stats = collector.getStats();
      expect(stats.totalMetrics).toBeLessThan(100);
      expect(stats.rotationCount).toBeGreaterThan(0);
    });

    it('should keep most recent metrics after rotation', () => {
      // Add 150 metrics
      for (let i = 0; i < 150; i++) {
        collector.record('test.metric', i);
      }

      const metrics = collector.getMetrics();
      const values = metrics.map(m => m.value);

      // Should not contain early values (0, 1, 2, etc.)
      expect(values).not.toContain(0);
      expect(values).not.toContain(1);

      // Should contain recent values
      expect(values).toContain(149);
      expect(values).toContain(148);
    });
  });

  describe('getAggregated', () => {
    it('should aggregate metrics correctly', () => {
      collector.record('test.metric', 10);
      collector.record('test.metric', 20);
      collector.record('test.metric', 30);

      const aggregated = collector.getAggregated('test.metric');
      expect(aggregated).not.toBeNull();
      expect(aggregated!.count).toBe(3);
      expect(aggregated!.sum).toBe(60);
      expect(aggregated!.avg).toBe(20);
      expect(aggregated!.min).toBe(10);
      expect(aggregated!.max).toBe(30);
    });

    it('should return null for non-existent metrics', () => {
      const aggregated = collector.getAggregated('nonexistent');
      expect(aggregated).toBeNull();
    });

    it('should respect time window', async () => {
      collector.record('test.metric', 100);

      // Wait 100ms
      await new Promise(resolve => setTimeout(resolve, 100));

      collector.record('test.metric', 200);

      // Get metrics from last 50ms only
      const aggregated = collector.getAggregated('test.metric', 50);
      expect(aggregated).not.toBeNull();
      expect(aggregated!.count).toBe(1); // Only recent metric
      expect(aggregated!.avg).toBe(200);
    });
  });

  describe('getMetricNames', () => {
    it('should return unique metric names', () => {
      collector.record('metric.a', 1);
      collector.record('metric.b', 2);
      collector.record('metric.a', 3);

      const names = collector.getMetricNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('metric.a');
      expect(names).toContain('metric.b');
    });
  });

  describe('getMetricsByTag', () => {
    it('should filter metrics by tag', () => {
      collector.record('metric', 1, { env: 'prod' });
      collector.record('metric', 2, { env: 'dev' });
      collector.record('metric', 3, { env: 'prod' });

      const prodMetrics = collector.getMetricsByTag('env', 'prod');
      expect(prodMetrics).toHaveLength(2);
      expect(prodMetrics.every(m => m.tags?.env === 'prod')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      collector.record('metric', 1);
      collector.record('metric', 2);

      const stats = collector.getStats();
      expect(stats.totalMetrics).toBe(2);
      expect(stats.maxMetrics).toBe(100);
      expect(stats.utilizationPercent).toBe(2);
      expect(stats.rotationCount).toBe(0);
      expect(stats.oldestMetric).toBeDefined();
      expect(stats.newestMetric).toBeDefined();
    });
  });

  describe('export', () => {
    it('should export metrics as JSON', () => {
      collector.record('metric.a', 10);
      collector.record('metric.b', 20);

      const exported = collector.export();
      const data = JSON.parse(exported);

      expect(data.exportedAt).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.metrics).toHaveLength(2);
      expect(data.aggregated).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      collector.record('metric', 1);
      collector.record('metric', 2);

      collector.clear();

      expect(collector.getMetrics()).toHaveLength(0);
      expect(collector.getStats().rotationCount).toBe(0);
    });
  });
});
```

---

## 🧪 Testing Instructions

1. **Run unit tests:**
   ```bash
   npm run test -- MetricsCollector.test.ts
   ```

2. **Test with TypeScript compilation:**
   ```bash
   npm run build
   ```

3. **Stress test (manual):**
   ```typescript
   // Add to a test script
   const collector = new MetricsCollector(1000);

   // Record 10,000 metrics
   for (let i = 0; i < 10000; i++) {
     collector.record('test.metric', Math.random() * 100);
   }

   // Check stats
   console.log(collector.getStats());
   // Should show rotation occurred
   ```

---

## ✅ Acceptance Criteria

- [ ] Metrics constants defined
- [ ] MetricsCollector implements bounded collection with rotation
- [ ] Rotation keeps most recent metrics
- [ ] Aggregation methods work correctly
- [ ] Statistics provide useful insights
- [ ] Export functionality includes aggregated data
- [ ] All unit tests passing (100% coverage)
- [ ] TypeScript compilation successful
- [ ] Memory stays bounded under stress test

---

## 📝 Completion Steps

1. Create metrics constants file
2. Update MetricsCollector with rotation logic
3. Add aggregation methods
4. Create comprehensive unit tests
5. Run tests and verify they pass
6. Test with stress scenario
7. Commit changes: `git commit -m "feat: Add bounded metrics collection with rotation (Task 06)"`
8. Delete this task file: `rm docs/tasks/task-06-metrics-rotation.md`
9. Update `docs/TASKS_MASTER.md` with completion status

---

## 🔗 Related Tasks

- Task 02: Buffer Memory Leak (similar pattern)
- Task 08: Comprehensive Test Suite

---

**Let's make metrics collection efficient! 📊**
