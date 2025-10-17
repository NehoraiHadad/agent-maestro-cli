/**
 * Core types for Agent entities
 */

export type AgentName = 'claude' | 'gemini' | 'codex';

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
  readonly capabilities: string[];
  readonly flags: AgentFlags;
  readonly requiresAuth: boolean;
  readonly authType: string;
  readonly packageName: string;
  readonly color: string;
}

export interface AgentConfig {
  inactivityTimeout?: number;
  maxDelegationDepth?: number;
  showSpinner?: boolean;
  verbose?: boolean;
}

export interface AgentExecutionResult {
  agent: string;
  content: string;
  delegations: DelegationResult[];
  exitCode: number;
}

export interface DelegationResult {
  fromAgent: string;
  toAgent: string;
  prompt: string;
  result: string;
}
