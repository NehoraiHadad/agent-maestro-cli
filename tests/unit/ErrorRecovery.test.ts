/**
 * Tests for ErrorRecovery
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  ErrorRecovery,
  MaestroError,
  AgentError,
  ErrorCategory,
  ErrorSeverity,
  RetryOptions
} from '../../src/shared/errors/index.js';

describe('ErrorRecovery', () => {
  let errorRecovery: ErrorRecovery;

  beforeEach(() => {
    errorRecovery = new ErrorRecovery();
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn<() => Promise<string>>().mockResolvedValue('success');
      const options: RetryOptions = {
        maxAttempts: 3,
        initialDelay: 100
      };

      const result = await errorRecovery.retry(fn, options);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const options: RetryOptions = {
        maxAttempts: 3,
        initialDelay: 10
      };

      const result = await errorRecovery.retry(fn, options);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValue(new Error('Network timeout error'));

      const options: RetryOptions = {
        maxAttempts: 3,
        initialDelay: 10
      };

      await expect(errorRecovery.retry(fn, options)).rejects.toThrow('Network timeout error');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const onRetry = jest.fn<(error: Error, attempt: number) => void>();

      const options: RetryOptions = {
        maxAttempts: 3,
        initialDelay: 10,
        onRetry
      };

      await errorRecovery.retry(fn, options);

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should use custom shouldRetry function', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValue(new Error('Non-retryable error'));

      const shouldRetry = jest.fn<(error: Error, attempt: number) => boolean>()
        .mockReturnValue(false);

      const options: RetryOptions = {
        maxAttempts: 3,
        initialDelay: 10,
        shouldRetry
      };

      await expect(errorRecovery.retry(fn, options)).rejects.toThrow('Non-retryable error');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Network timeout error1'))
        .mockRejectedValueOnce(new Error('Network timeout error2'))
        .mockResolvedValue('success');

      const options: RetryOptions = {
        maxAttempts: 3,
        initialDelay: 10,
        backoffMultiplier: 2
      };

      const startTime = Date.now();
      await errorRecovery.retry(fn, options);
      const duration = Date.now() - startTime;

      // Should wait at least 10ms + 20ms = 30ms
      expect(duration).toBeGreaterThanOrEqual(30);
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const error = new Error('ECONNREFUSED');
      expect(errorRecovery.isRetryableError(error)).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      const error = new Error('Operation timeout');
      expect(errorRecovery.isRetryableError(error)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const error = new Error('Invalid configuration');
      expect(errorRecovery.isRetryableError(error)).toBe(false);
    });
  });

  describe('categorize', () => {
    it('should categorize network errors', () => {
      const error = new MaestroError('Connection failed', 'NETWORK_ERROR');
      expect(errorRecovery.categorize(error)).toBe(ErrorCategory.NETWORK);
    });

    it('should categorize authentication errors', () => {
      const error = new MaestroError('Unauthorized', 'AUTH_ERROR');
      expect(errorRecovery.categorize(error)).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('should categorize configuration errors', () => {
      const error = new MaestroError('Invalid config', 'CONFIG_ERROR');
      expect(errorRecovery.categorize(error)).toBe(ErrorCategory.CONFIGURATION);
    });

    it('should categorize timeout errors', () => {
      const error = new MaestroError('Request timeout', 'TIMEOUT_ERROR');
      expect(errorRecovery.categorize(error)).toBe(ErrorCategory.TIMEOUT);
    });

    it('should categorize agent errors', () => {
      const error = new AgentError('claude', 'Agent spawn failed', 'AGENT_SPAWN_ERROR');
      expect(errorRecovery.categorize(error)).toBe(ErrorCategory.AGENT_EXECUTION);
    });

    it('should categorize file system errors', () => {
      const error = new Error('ENOENT: file not found');
      expect(errorRecovery.categorize(error)).toBe(ErrorCategory.FILE_SYSTEM);
    });

    it('should categorize unknown errors', () => {
      const error = new Error('Something went wrong');
      expect(errorRecovery.categorize(error)).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('getSeverity', () => {
    it('should assign CRITICAL severity to authentication errors', () => {
      const error = new MaestroError('Unauthorized', 'AUTH_ERROR');
      expect(errorRecovery.getSeverity(error)).toBe(ErrorSeverity.CRITICAL);
    });

    it('should assign HIGH severity to configuration errors', () => {
      const error = new MaestroError('Invalid config', 'CONFIG_ERROR');
      expect(errorRecovery.getSeverity(error)).toBe(ErrorSeverity.HIGH);
    });

    it('should assign MEDIUM severity to network errors', () => {
      const error = new MaestroError('Connection failed', 'NETWORK_ERROR');
      expect(errorRecovery.getSeverity(error)).toBe(ErrorSeverity.MEDIUM);
    });

    it('should assign LOW severity to unknown errors', () => {
      const error = new Error('Something minor');
      expect(errorRecovery.getSeverity(error)).toBe(ErrorSeverity.LOW);
    });
  });

  describe('suggestFix', () => {
    it('should suggest fixes for network errors', () => {
      const error = new MaestroError('Connection refused', 'NETWORK_ERROR');
      const suggestions = errorRecovery.suggestFix(error);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.action.includes('network'))).toBe(true);
    });

    it('should suggest fixes for authentication errors', () => {
      const error = new MaestroError('Unauthorized', 'AUTH_ERROR');
      const suggestions = errorRecovery.suggestFix(error);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.action.includes('credentials') || s.action.includes('API key'))).toBe(true);
    });

    it('should suggest fixes for configuration errors', () => {
      const error = new MaestroError('Invalid config', 'CONFIG_ERROR');
      const suggestions = errorRecovery.suggestFix(error);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.action.includes('configuration'))).toBe(true);
    });

    it('should suggest fixes for file system errors', () => {
      const error = new Error('ENOENT: file not found');
      const suggestions = errorRecovery.suggestFix(error);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.action.includes('file') || s.action.includes('permissions'))).toBe(true);
    });

    it('should suggest automated retry for retryable errors', () => {
      const error = new MaestroError('Timeout', 'TIMEOUT_ERROR');
      const suggestions = errorRecovery.suggestFix(error);

      expect(suggestions.some(s => s.automated === true)).toBe(true);
    });
  });

  describe('analyze', () => {
    it('should provide complete error analysis', () => {
      const error = new MaestroError('Connection failed', 'NETWORK_ERROR');
      const analyzed = errorRecovery.analyze(error, {
        operation: 'start-agent',
        agentName: 'claude'
      });

      expect(analyzed.error).toBe(error);
      expect(analyzed.category).toBe(ErrorCategory.NETWORK);
      expect(analyzed.severity).toBe(ErrorSeverity.MEDIUM);
      expect(analyzed.suggestions.length).toBeGreaterThan(0);
      expect(analyzed.isRetryable).toBe(true);
      expect(analyzed.context?.operation).toBe('start-agent');
      expect(analyzed.context?.agentName).toBe('claude');
    });
  });
});
