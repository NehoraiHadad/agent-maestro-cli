/**
 * Logging and configuration constants
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const DEFAULT_INACTIVITY_TIMEOUT = 60000; // 60 seconds
export const DEFAULT_MAX_DELEGATION_DEPTH = 3; // Legacy - no longer used but kept for compatibility
export const DEFAULT_LOG_DIRECTORY = './logs';
export const DEFAULT_LOG_LEVEL: LogLevel = 'info';
export const DEFAULT_MAX_LOG_FILES = 10;
export const DEFAULT_MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const DEFAULT_ENABLE_FILE_LOGGING = true;
export const DEFAULT_LOG_ROTATION = true;
export const DEFAULT_LOG_FLUSH_INTERVAL_MS = 1000; // 1 second
