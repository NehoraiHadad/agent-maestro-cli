/**
 * Delegation-related errors
 */
import { BaseError } from './BaseError.js';

export class DelegationError extends BaseError {
  constructor(message: string, agentName: string, context?: Record<string, unknown>) {
    super(
      message,
      'DELEGATION_ERROR',
      { agentName, ...context }
    );
  }
}

export class DelegationTimeoutError extends BaseError {
  constructor(agentName: string, timeoutMs: number) {
    super(
      `Delegation to '${agentName}' timed out after ${timeoutMs}ms`,
      'DELEGATION_TIMEOUT',
      { agentName, timeoutMs }
    );
  }
}

export class MaxDelegationDepthError extends BaseError {
  constructor(maxDepth: number, currentDepth?: number) {
    super(
      `Maximum delegation depth of ${maxDepth} exceeded`,
      'MAX_DELEGATION_DEPTH',
      { maxDepth, currentDepth }
    );
  }
}

export class DelegationParseError extends BaseError {
  constructor(line: string, reason: string) {
    super(
      `Failed to parse delegation request: ${reason}`,
      'DELEGATION_PARSE_ERROR',
      { line: line.substring(0, 100), reason }
    );
  }
}

export class InvalidDelegationRequestError extends BaseError {
  constructor(errors: string[], request?: unknown) {
    super(
      `Invalid delegation request: ${errors.join(', ')}`,
      'INVALID_DELEGATION_REQUEST',
      { errors, request }
    );
  }
}
