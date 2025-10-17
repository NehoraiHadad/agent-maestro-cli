/**
 * Custom error classes for AgentMaestro
 */

export class MaestroError extends Error {
  constructor(message, code = 'MAESTRO_ERROR') {
    super(message);
    this.name = 'MaestroError';
    this.code = code;
  }
}

export class AgentNotFoundError extends MaestroError {
  constructor(agentName) {
    super(`Agent "${agentName}" not found`, 'AGENT_NOT_FOUND');
    this.name = 'AgentNotFoundError';
    this.agentName = agentName;
  }
}

export class AgentNotAvailableError extends MaestroError {
  constructor(agentName, packageName) {
    super(
      `Agent "${agentName}" is not installed. Install with: npm install -g ${packageName}`,
      'AGENT_NOT_AVAILABLE'
    );
    this.name = 'AgentNotAvailableError';
    this.agentName = agentName;
    this.packageName = packageName;
  }
}

export class DelegationError extends MaestroError {
  constructor(message, agentName) {
    super(message, 'DELEGATION_ERROR');
    this.name = 'DelegationError';
    this.agentName = agentName;
  }
}

export class DelegationTimeoutError extends DelegationError {
  constructor(agentName, timeout) {
    super(
      `Delegation to "${agentName}" timed out after ${timeout}ms`,
      agentName
    );
    this.name = 'DelegationTimeoutError';
    this.timeout = timeout;
  }
}

export class MaxDelegationDepthError extends DelegationError {
  constructor(depth) {
    super(
      `Maximum delegation depth (${depth}) exceeded`,
      null
    );
    this.name = 'MaxDelegationDepthError';
    this.depth = depth;
  }
}

export class ProtocolParseError extends MaestroError {
  constructor(message, line) {
    super(`Failed to parse delegation protocol: ${message}`, 'PROTOCOL_PARSE_ERROR');
    this.name = 'ProtocolParseError';
    this.line = line;
  }
}

export class PTYError extends MaestroError {
  constructor(message) {
    super(message, 'PTY_ERROR');
    this.name = 'PTYError';
  }
}

/**
 * Format error for display
 */
export function formatError(error) {
  if (error instanceof MaestroError) {
    return {
      type: error.name,
      code: error.code,
      message: error.message,
      ...error
    };
  }

  return {
    type: 'Error',
    code: 'UNKNOWN_ERROR',
    message: error.message,
    stack: error.stack
  };
}
