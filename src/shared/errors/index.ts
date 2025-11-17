/**
 * Centralized error exports
 */
export { BaseError } from './BaseError.js';
export {
  AgentNotFoundError,
  AgentNotAvailableError,
  AgentExecutionError,
  AgentTimeoutError,
  AgentConfigError
} from './AgentErrors.js';
export {
  PTYError,
  PTYSpawnError,
  PTYProcessNotFoundError,
  PTYProcessNotRunningError,
  PTYWriteError
} from './PTYErrors.js';
export { ConfigValidationError } from './ConfigErrors.js';
export {
  OrchestrationError,
  AgentExecutionError as AgentExecutionErrorOrch,
  OutputProcessingError,
  SessionError,
  ValidationError,
  TimeoutError
} from './OrchestrationErrors.js';
