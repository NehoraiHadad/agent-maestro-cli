/**
 * Event handler configuration constants
 */

/** Maximum number of listeners per event type per process */
export const DEFAULT_MAX_LISTENERS = 10;

/** Whether to warn when approaching max listeners */
export const WARN_ON_LISTENER_THRESHOLD = true;

/** Threshold percentage to trigger warning (e.g., 0.8 = 80%) */
export const LISTENER_WARNING_THRESHOLD = 0.8;
