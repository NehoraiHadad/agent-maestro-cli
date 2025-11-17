/**
 * MetricsCollector.ts
 * Collects and tracks performance metrics with bounded collection and rotation
 */

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

export interface MetricsSummary {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  uptime: number;
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

/**
 * Collects performance and operational metrics with bounded collection
 */
export class MetricsCollector {
  private metrics: Metric[] = [];
  private executionTimes: Map<string, number> = new Map();
  private startTime: Date = new Date();
  private maxMetrics: number;
  private rotationCount: number = 0;

  private counters = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalExecutionTime: 0
  };

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
      summary: this.getSummary(),
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
   * Get all metrics
   */
  getMetrics(name?: string): readonly Metric[] {
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
    this.rotationCount = 0;
    this.counters = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutionTime: 0
    };
    this.startTime = new Date();
  }
}
