/**
 * Protocol constants for delegation
 */

export const DELEGATION_PREFIX = 'MAESTRO_DELEGATE::';
export const DELEGATION_RESULT_PREFIX = '[MAESTRO_RESULT]';
export const DELEGATION_ERROR_PREFIX = '[MAESTRO_ERROR]';

export const DELEGATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high'
} as const;

export const DEFAULT_DELEGATION_TIMEOUT = 60000; // 60 seconds
export const DEFAULT_INACTIVITY_TIMEOUT = 60000; // 60 seconds
export const DEFAULT_MAX_DELEGATION_DEPTH = 3;
