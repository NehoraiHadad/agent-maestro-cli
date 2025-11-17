import { describe, it, expect, beforeEach } from '@jest/globals';
import { RetryManager, RetryError } from '../../src/shared/utils/RetryManager.js';

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager();
  });

  describe('Successful Execution', () => {
    it('should execute function without retry on success', async () => {
      let attempts = 0;

      const fn = async () => {
        attempts++;
        return 'success';
      };

      const result = await retryManager.executeWithRetry(fn, {
        maxRetries: 3,
        baseDelay: 10
      });

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should return function result', async () => {
      const fn = async () => ({ data: 'test', value: 42 });

      const result = await retryManager.executeWithRetry(fn, {
        maxRetries: 2,
        baseDelay: 10
      });

      expect(result).toEqual({ data: 'test', value: 42 });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure', async () => {
      let attempts = 0;

      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Retry me');
        }
        return 'success';
      };

      const result = await retryManager.executeWithRetry(fn, {
        maxRetries: 3,
        baseDelay: 10
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should respect max retries', async () => {
      let attempts = 0;

      const fn = async () => {
        attempts++;
        throw new Error('Always fail');
      };

      await expect(
        retryManager.executeWithRetry(fn, { maxRetries: 2, baseDelay: 10 })
      ).rejects.toThrow(RetryError);

      expect(attempts).toBe(2);
    });

    it('should throw RetryError after max retries', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };

      await expect(
        retryManager.executeWithRetry(fn, { maxRetries: 2, baseDelay: 10 })
      ).rejects.toThrow(RetryError);

      try {
        await retryManager.executeWithRetry(fn, { maxRetries: 2, baseDelay: 10 });
      } catch (error) {
        expect((error as RetryError).attempts).toBe(2);
        expect((error as RetryError).lastError.message).toBe('Test error');
      }
    });

    it('should include last error in RetryError', async () => {
      const originalError = new Error('Original failure');
      const fn = async () => {
        throw originalError;
      };

      try {
        await retryManager.executeWithRetry(fn, { maxRetries: 1, baseDelay: 10 });
      } catch (error) {
        expect((error as RetryError).lastError).toBe(originalError);
      }
    });
  });

  describe('Delay Mechanisms', () => {
    it('should use exponential backoff by default', async () => {
      let attempt = 0;

      const fn = async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error('Retry');
        }
        return 'done';
      };

      const startTime = Date.now();

      await retryManager.executeWithRetry(fn, {
        maxRetries: 3,
        baseDelay: 100,
        exponential: true
      });

      const totalTime = Date.now() - startTime;

      // Should have delays: 100ms, 200ms
      // Total should be at least 300ms (100 + 200)
      expect(totalTime).toBeGreaterThanOrEqual(250);
    });

    it('should use linear backoff when exponential is false', async () => {
      let attempt = 0;

      const fn = async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error('Retry');
        }
        return 'done';
      };

      const startTime = Date.now();

      await retryManager.executeWithRetry(fn, {
        maxRetries: 3,
        baseDelay: 100,
        exponential: false
      });

      const totalTime = Date.now() - startTime;

      // Should have delays: 100ms, 200ms
      // Total should be at least 300ms
      expect(totalTime).toBeGreaterThanOrEqual(250);
    });

    it('should respect max delay', async () => {
      let attempt = 0;

      const fn = async () => {
        attempt++;
        if (attempt < 5) {
          throw new Error('Retry');
        }
        return 'done';
      };

      const startTime = Date.now();

      await retryManager.executeWithRetry(fn, {
        maxRetries: 5,
        baseDelay: 100,
        maxDelay: 200,
        exponential: true
      });

      const totalTime = Date.now() - startTime;

      // With exponential: 100, 200, 400 (capped to 200), 800 (capped to 200)
      // So actual delays: 100, 200, 200, 200 = 700ms
      expect(totalTime).toBeGreaterThanOrEqual(650);
      expect(totalTime).toBeLessThan(1500); // Should be much less due to capping
    });
  });

  describe('Retry Callback', () => {
    it('should call onRetry callback', async () => {
      const retries: Array<{ attempt: number; error: Error }> = [];

      const fn = async () => {
        throw new Error('Fail');
      };

      try {
        await retryManager.executeWithRetry(fn, {
          maxRetries: 3,
          baseDelay: 10,
          onRetry: (attempt, error) => {
            retries.push({ attempt, error });
          }
        });
      } catch (e) {
        // Expected
      }

      expect(retries).toHaveLength(2); // Called on attempts 1 and 2 (not on final)
      expect(retries[0].attempt).toBe(1);
      expect(retries[1].attempt).toBe(2);
    });

    it('should pass error to callback', async () => {
      let capturedError: Error | null = null;

      const testError = new Error('Test error');
      const fn = async () => {
        throw testError;
      };

      try {
        await retryManager.executeWithRetry(fn, {
          maxRetries: 2,
          baseDelay: 10,
          onRetry: (_attempt, error) => {
            capturedError = error;
          }
        });
      } catch (e) {
        // Expected
      }

      expect(capturedError).toBe(testError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single retry attempt', async () => {
      let attempts = 0;

      const fn = async () => {
        attempts++;
        throw new Error('Fail');
      };

      try {
        await retryManager.executeWithRetry(fn, {
          maxRetries: 1,
          baseDelay: 10
        });
      } catch (e) {
        // Expected
      }

      expect(attempts).toBe(1);
    });

    it('should handle non-Error exceptions', async () => {
      const fn = async () => {
        throw 'String error';
      };

      await expect(
        retryManager.executeWithRetry(fn, {
          maxRetries: 1,
          baseDelay: 10
        })
      ).rejects.toThrow(RetryError);

      try {
        await retryManager.executeWithRetry(fn, {
          maxRetries: 1,
          baseDelay: 10
        });
      } catch (error) {
        expect((error as RetryError).lastError.message).toBe('String error');
      }
    });

    it('should work with async errors', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async error');
      };

      try {
        await retryManager.executeWithRetry(fn, {
          maxRetries: 2,
          baseDelay: 10
        });
      } catch (error) {
        expect(error).toBeInstanceOf(RetryError);
      }
    });

    it('should handle zero base delay', async () => {
      let attempts = 0;

      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Retry');
        }
        return 'success';
      };

      const result = await retryManager.executeWithRetry(fn, {
        maxRetries: 2,
        baseDelay: 0
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });
  });

  describe('Default Options', () => {
    it('should use default options when not specified', async () => {
      const fn = async () => 'success';

      const result = await retryManager.executeWithRetry(fn);

      expect(result).toBe('success');
    });

    it('should merge partial options with defaults', async () => {
      let attempts = 0;

      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Retry');
        }
        return 'success';
      };

      // Only specify maxRetries, others should use defaults
      await retryManager.executeWithRetry(fn, {
        maxRetries: 2,
        baseDelay: 10
      });

      expect(attempts).toBe(2);
    });
  });
});
