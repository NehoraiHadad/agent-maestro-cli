/**
 * Error types and categories for comprehensive error handling
 */

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  CONFIGURATION = 'CONFIGURATION',
  VALIDATION = 'VALIDATION',
  AGENT_EXECUTION = 'AGENT_EXECUTION',
  FILE_SYSTEM = 'FILE_SYSTEM',
  TIMEOUT = 'TIMEOUT',
  PROCESS = 'PROCESS',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Retry strategy options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier (exponential backoff) */
  backoffMultiplier?: number;
  /** Custom retry condition function */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Callback for each retry attempt */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Error context for detailed reporting
 */
export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  operation?: string;
  timestamp: Date;
  agentName?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Error recovery suggestion
 */
export interface RecoverySuggestion {
  action: string;
  description: string;
  automated?: boolean;
}

/**
 * Categorized error with metadata
 */
export interface CategorizedError {
  error: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  suggestions: RecoverySuggestion[];
  isRetryable: boolean;
  context?: ErrorContext;
}
