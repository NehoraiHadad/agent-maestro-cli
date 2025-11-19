/**
 * ErrorRecovery - Provides retry mechanisms and error recovery suggestions
 */

import {
  RetryOptions,
  ErrorCategory,
  ErrorSeverity,
  CategorizedError,
  RecoverySuggestion,
  ErrorContext
} from './types.js';
import { MaestroError } from './MaestroError.js';
import { AgentError } from './AgentError.js';

export class ErrorRecovery {
  /**
   * Retry a function with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    const {
      maxAttempts,
      initialDelay,
      maxDelay = 30000,
      backoffMultiplier = 2,
      shouldRetry,
      onRetry
    } = options;

    let lastError: Error | undefined;
    let currentDelay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        const shouldAttemptRetry = shouldRetry
          ? shouldRetry(lastError, attempt)
          : this.isRetryableError(lastError);

        if (!shouldAttemptRetry || attempt >= maxAttempts) {
          throw lastError;
        }

        // Call retry callback if provided
        if (onRetry) {
          onRetry(lastError, attempt);
        }

        // Wait before retrying
        await this.delay(currentDelay);

        // Exponential backoff
        currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError || new Error('Retry failed without error');
  }

  /**
   * Determine if an error is retryable
   */
  isRetryableError(error: Error): boolean {
    const category = this.categorize(error);

    // Network and timeout errors are typically retryable
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.TIMEOUT) {
      return true;
    }

    // Check error message for retryable patterns
    const retryablePatterns = [
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i,
      /ECONNRESET/i,
      /timeout/i,
      /temporary/i,
      /retry/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Categorize an error
   */
  categorize(error: Error): ErrorCategory {
    // Check MaestroError and AgentError codes
    if (error instanceof MaestroError || error instanceof AgentError) {
      const code = error.code;

      if (code.includes('NETWORK') || code.includes('CONNECTION')) {
        return ErrorCategory.NETWORK;
      }
      if (code.includes('AUTH') || code.includes('PERMISSION')) {
        return ErrorCategory.AUTHENTICATION;
      }
      if (code.includes('CONFIG')) {
        return ErrorCategory.CONFIGURATION;
      }
      if (code.includes('TIMEOUT')) {
        return ErrorCategory.TIMEOUT;
      }
      if (code.includes('VALIDATION')) {
        return ErrorCategory.VALIDATION;
      }
      if (code.includes('AGENT') || code.includes('SPAWN')) {
        return ErrorCategory.AGENT_EXECUTION;
      }
      if (code.includes('FILE') || code.includes('ENOENT') || code.includes('EACCES')) {
        return ErrorCategory.FILE_SYSTEM;
      }
      if (code.includes('PROCESS')) {
        return ErrorCategory.PROCESS;
      }
    }

    // Analyze error message and properties
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('connection') ||
        message.includes('econnrefused') || message.includes('enotfound')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('auth') || message.includes('permission') ||
        message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('config') || message.includes('setting')) {
      return ErrorCategory.CONFIGURATION;
    }
    if (message.includes('timeout') || message.includes('etimedout')) {
      return ErrorCategory.TIMEOUT;
    }
    if (message.includes('invalid') || message.includes('validation')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('enoent') || message.includes('eacces') || message.includes('file')) {
      return ErrorCategory.FILE_SYSTEM;
    }
    if (message.includes('process') || message.includes('spawn')) {
      return ErrorCategory.PROCESS;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Get severity level for an error
   */
  getSeverity(error: Error): ErrorSeverity {
    const category = this.categorize(error);

    // Critical categories
    if (category === ErrorCategory.AUTHENTICATION ||
        category === ErrorCategory.PROCESS) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity
    if (category === ErrorCategory.CONFIGURATION ||
        category === ErrorCategory.AGENT_EXECUTION) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity
    if (category === ErrorCategory.NETWORK ||
        category === ErrorCategory.TIMEOUT ||
        category === ErrorCategory.FILE_SYSTEM) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity
    return ErrorSeverity.LOW;
  }

  /**
   * Suggest fixes for common errors
   */
  suggestFix(error: Error): RecoverySuggestion[] {
    const category = this.categorize(error);
    const suggestions: RecoverySuggestion[] = [];

    switch (category) {
      case ErrorCategory.NETWORK:
        suggestions.push({
          action: 'Check network connectivity',
          description: 'Ensure you have a stable internet connection',
          automated: false
        });
        suggestions.push({
          action: 'Retry the operation',
          description: 'Network errors are often temporary',
          automated: true
        });
        if (error.message.includes('ECONNREFUSED')) {
          suggestions.push({
            action: 'Verify service is running',
            description: 'The target service may not be running or accessible',
            automated: false
          });
        }
        break;

      case ErrorCategory.AUTHENTICATION:
        suggestions.push({
          action: 'Check API key/credentials',
          description: 'Verify your authentication credentials are correct',
          automated: false
        });
        suggestions.push({
          action: 'Review permissions',
          description: 'Ensure you have necessary permissions for this operation',
          automated: false
        });
        break;

      case ErrorCategory.CONFIGURATION:
        suggestions.push({
          action: 'Check configuration file',
          description: 'Review your maestro configuration for errors',
          automated: false
        });
        suggestions.push({
          action: 'Run initialization',
          description: 'Try running "maestro init" to reset configuration',
          automated: false
        });
        break;

      case ErrorCategory.FILE_SYSTEM:
        suggestions.push({
          action: 'Check file permissions',
          description: 'Ensure you have read/write access to required files',
          automated: false
        });
        if (error.message.includes('ENOENT')) {
          suggestions.push({
            action: 'Verify file exists',
            description: 'The specified file or directory was not found',
            automated: false
          });
        }
        break;

      case ErrorCategory.TIMEOUT:
        suggestions.push({
          action: 'Increase timeout duration',
          description: 'The operation may need more time to complete',
          automated: false
        });
        suggestions.push({
          action: 'Retry the operation',
          description: 'Timeouts can be transient',
          automated: true
        });
        break;

      case ErrorCategory.AGENT_EXECUTION:
        suggestions.push({
          action: 'Check Claude Code installation',
          description: 'Ensure Claude Code CLI is properly installed',
          automated: false
        });
        suggestions.push({
          action: 'Verify agent configuration',
          description: 'Review agent settings and paths',
          automated: false
        });
        break;

      case ErrorCategory.PROCESS:
        suggestions.push({
          action: 'Check system resources',
          description: 'Ensure sufficient memory and CPU are available',
          automated: false
        });
        suggestions.push({
          action: 'Review process logs',
          description: 'Check logs for more detailed error information',
          automated: false
        });
        break;

      case ErrorCategory.VALIDATION:
        suggestions.push({
          action: 'Check input parameters',
          description: 'Verify all required parameters are provided and valid',
          automated: false
        });
        break;

      default:
        suggestions.push({
          action: 'Review error details',
          description: 'Check error message and stack trace for more information',
          automated: false
        });
    }

    return suggestions;
  }

  /**
   * Get full categorized error information
   */
  analyze(error: Error, context?: Partial<ErrorContext>): CategorizedError {
    const category = this.categorize(error);
    const severity = this.getSeverity(error);
    const suggestions = this.suggestFix(error);
    const isRetryable = this.isRetryableError(error);

    return {
      error,
      category,
      severity,
      suggestions,
      isRetryable,
      context: context ? {
        category,
        severity,
        timestamp: new Date(),
        ...context
      } : undefined
    };
  }

  /**
   * Delay helper for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
