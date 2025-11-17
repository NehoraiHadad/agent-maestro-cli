/**
 * Timeout constants for various operations
 */

export const TIMEOUTS = {
  /** Command availability check timeout (ms) */
  COMMAND_AVAILABILITY_CHECK: 2000,

  /** Default inactivity timeout (ms) */
  DEFAULT_INACTIVITY: 60000,

  /** Graceful shutdown timeout before force kill (ms) */
  GRACEFUL_SHUTDOWN: 5000,

  /** PTY process spawn timeout (ms) */
  PTY_SPAWN: 10000,

  /** Agent execution timeout (ms) */
  AGENT_EXECUTION: 300000, // 5 minutes

  /** Retry backoff base delay (ms) */
  RETRY_BACKOFF_BASE: 1000
} as const;

export type TimeoutKey = keyof typeof TIMEOUTS;
