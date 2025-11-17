/**
 * Buffer size constants for PTY process management
 */

/** Maximum buffer size in bytes (default: 10MB) */
export const DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB

/** Warning threshold - log warning when buffer reaches this size */
export const BUFFER_WARNING_THRESHOLD = 0.8; // 80% of max size

/** Trim percentage - when buffer exceeds max, trim to this percentage */
export const BUFFER_TRIM_TO_PERCENTAGE = 0.5; // Trim to 50% of max size

/** Minimum buffer size (safety check) */
export const MIN_BUFFER_SIZE = 1024; // 1KB
