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
