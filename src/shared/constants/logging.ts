/**
 * Logging constants
 */

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
} as const;

export const DEFAULT_LOG_DIRECTORY = './logs';
export const DEFAULT_LOG_LEVEL = 'info';
export const DEFAULT_MAX_LOG_FILES = 10;
export const DEFAULT_MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const DEFAULT_ENABLE_FILE_LOGGING = true;
export const DEFAULT_LOG_ROTATION = true;
export const DEFAULT_LOG_FLUSH_INTERVAL_MS = 5000; // 5 seconds

export const LOG_FILE_NAMES = {
  MAIN: 'maestro',
  DELEGATIONS: 'delegations',
  ERRORS: 'errors',
  PERFORMANCE: 'performance'
} as const;

export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];
