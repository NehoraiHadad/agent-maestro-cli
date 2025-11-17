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
