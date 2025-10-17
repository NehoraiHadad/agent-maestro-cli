/**
 * Agent-related errors
 */
import { BaseError } from './BaseError.js';

export class AgentNotFoundError extends BaseError {
  constructor(agentName: string) {
    super(
      `Agent '${agentName}' not found in registry`,
      'AGENT_NOT_FOUND',
      { agentName }
    );
  }
}

export class AgentNotAvailableError extends BaseError {
  constructor(agentName: string, packageName: string) {
    super(
      `Agent '${agentName}' is not installed or not available`,
      'AGENT_NOT_AVAILABLE',
      { agentName, packageName }
    );
  }

  public get packageName(): string {
    return this.context?.packageName as string;
  }
}

export class AgentExecutionError extends BaseError {
  constructor(agentName: string, reason: string, exitCode?: number) {
    super(
      `Agent '${agentName}' execution failed: ${reason}`,
      'AGENT_EXECUTION_ERROR',
      { agentName, reason, exitCode }
    );
  }
}

export class AgentTimeoutError extends BaseError {
  constructor(agentName: string, timeoutMs: number) {
    super(
      `Agent '${agentName}' timed out after ${timeoutMs}ms`,
      'AGENT_TIMEOUT',
      { agentName, timeoutMs }
    );
  }
}

export class AgentConfigError extends BaseError {
  constructor(agentName: string, reason: string) {
    super(
      `Invalid configuration for agent '${agentName}': ${reason}`,
      'AGENT_CONFIG_ERROR',
      { agentName, reason }
    );
  }
}
