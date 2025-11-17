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
