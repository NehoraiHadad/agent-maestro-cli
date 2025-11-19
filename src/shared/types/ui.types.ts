/**
 * UI-related type definitions
 */

import type { Ora } from 'ora';

/**
 * Keypress event from readline
 */
export interface KeypressEvent {
  name?: string;
  sequence?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

/**
 * Spinner instance (Ora)
 */
export type SpinnerInstance = Ora;

/**
 * Chalk color methods available for styling
 */
export type ChalkColorMethod =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray'
  | 'grey';

/**
 * Agent label configuration for console output
 */
export interface AgentLabelConfig {
  label: string;
  color?: ChalkColorMethod;
  bold?: boolean;
}

/**
 * Menu choice for interactive selection
 */
export interface MenuChoice {
  name: string;
  value: string;
  description?: string;
}

/**
 * Menu selection result
 */
export interface MenuSelection {
  agent: string;
}

/**
 * Session information for status display
 */
export interface SessionInfo {
  sessionId?: string;
  mode: 'Interactive' | 'One-shot';
  planMode: boolean;
  messageCount: number;
  duration: number;
  agentName: string;
}

/**
 * Status information for display
 */
export interface StatusInfo {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

/**
 * Progress bar configuration
 */
export interface ProgressConfig {
  current: number;
  total: number;
  label: string;
  width?: number;
  showPercentage?: boolean;
}

/**
 * Status display theme configuration
 */
export interface StatusDisplayTheme {
  borderColor: ChalkColorMethod;
  headerColor: ChalkColorMethod;
  accentColor: ChalkColorMethod;
  labelColor: ChalkColorMethod;
  valueColor: ChalkColorMethod;
  progressBarFilled: string;
  progressBarEmpty: string;
  progressBarColor: ChalkColorMethod;
}

/**
 * Status display configuration
 */
export interface StatusDisplayConfig {
  enabled: boolean;
  showHeader: boolean;
  showProgress: boolean;
  headerWidth: number;
  theme: StatusDisplayTheme;
}
