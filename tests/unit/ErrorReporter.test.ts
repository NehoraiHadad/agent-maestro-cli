/**
 * Tests for ErrorReporter
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  ErrorReporter,
  MaestroError,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext,
  CategorizedError
} from '../../src/shared/errors/index.js';

describe('ErrorReporter', () => {
  let errorReporter: ErrorReporter;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    errorReporter = new ErrorReporter();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('report', () => {
    it('should report error with context', () => {
      const error = new MaestroError('Test error', 'TEST_ERROR');
      const context: ErrorContext = {
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        operation: 'test-operation',
        timestamp: new Date()
      };

      errorReporter.report(error, context);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('Test error');
    });

    it('should report error without context', () => {
      const error = new Error('Simple error');

      errorReporter.report(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('formatUserMessage', () => {
    it('should format error with all details', () => {
      const error = new MaestroError('Test error', 'TEST_ERROR', { key: 'value' });
      const categorized: CategorizedError = {
        error,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        suggestions: [
          {
            action: 'Check connection',
            description: 'Verify network connectivity',
            automated: false
          }
        ],
        isRetryable: true,
        context: {
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.HIGH,
          operation: 'start-agent',
          timestamp: new Date(),
          agentName: 'claude'
        }
      };

      const formatted = errorReporter.formatUserMessage(categorized);

      expect(formatted).toContain('Test error');
      expect(formatted).toContain('TEST_ERROR');
      expect(formatted).toContain('Check connection');
      expect(formatted).toContain('start-agent');
      expect(formatted).toContain('claude');
      expect(formatted).toContain('retryable');
    });

    it('should format error without suggestions', () => {
      const error = new Error('Simple error');
      const categorized: CategorizedError = {
        error,
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.LOW,
        suggestions: [],
        isRetryable: false
      };

      const formatted = errorReporter.formatUserMessage(categorized);

      expect(formatted).toContain('Simple error');
      expect(formatted).not.toContain('Suggestions');
    });

    it('should indicate retryable errors', () => {
      const error = new MaestroError('Network timeout', 'TIMEOUT_ERROR');
      const categorized: CategorizedError = {
        error,
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        suggestions: [],
        isRetryable: true
      };

      const formatted = errorReporter.formatUserMessage(categorized);

      expect(formatted).toContain('retryable');
    });
  });

  describe('formatSimpleMessage', () => {
    it('should format simple message with category', () => {
      const error = new MaestroError('Config error', 'CONFIG_ERROR');

      const formatted = errorReporter.formatSimpleMessage(error);

      expect(formatted).toContain('Config error');
      // Should contain category reference
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe('formatSuggestions', () => {
    it('should format multiple suggestions', () => {
      const suggestions = [
        {
          action: 'Check config',
          description: 'Review configuration file',
          automated: false
        },
        {
          action: 'Retry operation',
          description: 'Try again',
          automated: true
        }
      ];

      const formatted = errorReporter.formatSuggestions(suggestions);

      expect(formatted).toContain('Suggestions');
      expect(formatted).toContain('Check config');
      expect(formatted).toContain('Retry operation');
      expect(formatted).toContain('[Auto]');
      expect(formatted).toContain('[Manual]');
    });

    it('should return empty string for no suggestions', () => {
      const formatted = errorReporter.formatSuggestions([]);

      expect(formatted).toBe('');
    });
  });

  describe('createSummary', () => {
    it('should create summary for network error', () => {
      const error = new MaestroError('Connection failed', 'NETWORK_ERROR');

      const summary = errorReporter.createSummary(error);

      expect(summary).toContain('NETWORK');
      expect(summary).toContain('Connection failed');
      expect(summary).toContain('network');
    });

    it('should create summary for authentication error', () => {
      const error = new MaestroError('Unauthorized', 'AUTH_ERROR');

      const summary = errorReporter.createSummary(error);

      expect(summary).toContain('AUTHENTICATION');
      expect(summary).toContain('credentials');
    });

    it('should create summary for configuration error', () => {
      const error = new MaestroError('Invalid config', 'CONFIG_ERROR');

      const summary = errorReporter.createSummary(error);

      expect(summary).toContain('CONFIGURATION');
      expect(summary).toContain('configuration');
    });
  });

  describe('shouldLog', () => {
    it('should return true for regular errors', () => {
      const error = new Error('Normal error');

      expect(errorReporter.shouldLog(error)).toBe(true);
    });

    it('should return false for user cancellation', () => {
      const error = new Error('User cancelled operation');

      expect(errorReporter.shouldLog(error)).toBe(false);
    });

    it('should return false for user abort', () => {
      const error = new Error('User aborted');

      expect(errorReporter.shouldLog(error)).toBe(false);
    });

    it('should return false for SIGINT', () => {
      const error = new Error('Process terminated by SIGINT');

      expect(errorReporter.shouldLog(error)).toBe(false);
    });
  });

  describe('logError', () => {
    it('should log error to console', () => {
      const error = new MaestroError('Test error', 'TEST_ERROR');
      const context: ErrorContext = {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date()
      };

      errorReporter.logError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
