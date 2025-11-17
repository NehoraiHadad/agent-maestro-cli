import { BaseError } from './BaseError.js';

/**
 * Base error for orchestration-related failures
 */
export class OrchestrationError extends BaseError {
  constructor(
    code: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, code, context);
    this.name = 'OrchestrationError';
  }
}

/**
 * Error thrown when agent execution fails
 */
export class AgentExecutionError extends OrchestrationError {
  public readonly agentName: string;
  public readonly exitCode?: number;

  constructor(
    agentName: string,
    message: string,
    exitCode?: number,
    context?: Record<string, unknown>
  ) {
    super('AGENT_EXECUTION_ERROR', message, {
      ...context,
      agentName,
      exitCode
    });
    this.name = 'AgentExecutionError';
    this.agentName = agentName;
    this.exitCode = exitCode;
  }
}

/**
 * Error thrown when output processing fails
 */
export class OutputProcessingError extends OrchestrationError {
  public readonly agentName: string;
  public readonly rawOutput?: string;

  constructor(
    agentName: string,
    message: string,
    rawOutput?: string,
    context?: Record<string, unknown>
  ) {
    super('OUTPUT_PROCESSING_ERROR', message, {
      ...context,
      agentName,
      outputPreview: rawOutput?.substring(0, 100)
    });
    this.name = 'OutputProcessingError';
    this.agentName = agentName;
    this.rawOutput = rawOutput;
  }
}

/**
 * Error thrown when session management fails
 */
export class SessionError extends OrchestrationError {
  public readonly sessionId?: string;

  constructor(
    message: string,
    sessionId?: string,
    context?: Record<string, unknown>
  ) {
    super('SESSION_ERROR', message, {
      ...context,
      sessionId
    });
    this.name = 'SessionError';
    this.sessionId = sessionId;
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends OrchestrationError {
  public readonly validationErrors: string[];

  constructor(
    message: string,
    validationErrors: string[],
    context?: Record<string, unknown>
  ) {
    super('VALIDATION_ERROR', message, {
      ...context,
      validationErrors
    });
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

/**
 * Error thrown when timeout occurs
 */
export class TimeoutError extends OrchestrationError {
  public readonly timeoutMs: number;

  constructor(
    message: string,
    timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super('TIMEOUT_ERROR', message, {
      ...context,
      timeoutMs
    });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}
