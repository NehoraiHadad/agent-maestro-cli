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
