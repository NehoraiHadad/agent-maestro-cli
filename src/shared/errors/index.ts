/**
 * Centralized error exports
 */
export { BaseError } from './BaseError.js';
export { MaestroError } from './MaestroError.js';
export { AgentError } from './AgentError.js';

// Error handling utilities
export { ErrorRecovery } from './ErrorRecovery.js';
export { ErrorReporter } from './ErrorReporter.js';

// Error types and categories
export {
  ErrorCategory,
  ErrorSeverity,
  RetryOptions,
  ErrorContext,
  RecoverySuggestion,
  CategorizedError
} from './types.js';
