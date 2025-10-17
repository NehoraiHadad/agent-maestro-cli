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
  DelegationError,
  DelegationTimeoutError,
  MaxDelegationDepthError,
  DelegationParseError,
  InvalidDelegationRequestError
} from './DelegationErrors.js';
export {
  PTYError,
  PTYSpawnError,
  PTYProcessNotFoundError,
  PTYProcessNotRunningError,
  PTYWriteError
} from './PTYErrors.js';
