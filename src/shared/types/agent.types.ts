/**
 * Core types for Agent entities
 */

/**
 * Agent name type - AgentMaestro only supports Claude Code
 */
export type AgentName = 'claude';

export interface AgentFlags {
  prompt: string;
  json?: string[];
  stream?: string[];
  mode?: {
    suggest?: string;
    autoEdit?: string;
    fullAuto?: string;
  };
}

export interface Agent {
  readonly name: AgentName;
  readonly displayName: string;
  readonly command: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly flags: Readonly<AgentFlags>;
  readonly requiresAuth: boolean;
  readonly authType: string;
  readonly packageName: string;
  readonly color: string;
}

export interface AgentConfig {
  inactivityTimeout?: number;
  showSpinner?: boolean;
  verbose?: boolean;
  planMode?: boolean;
}

/**
 * Options for agent execution
 */
export interface AgentExecutionOptions {
  /** Enable streaming output */
  stream?: boolean;

  /** Continue previous session (ONLY in interactive mode) */
  continueSession?: boolean;

  /** Specific session ID to resume */
  sessionId?: string;

  /** Enable plan mode (research without execution) */
  planMode?: boolean;
}

export interface AgentExecutionResult {
  agent: string;
  content: string;
  exitCode: number;
}
