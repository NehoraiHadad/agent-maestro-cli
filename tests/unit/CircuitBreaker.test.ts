import { describe, it, expect, beforeEach } from '@jest/globals';
import { CircuitBreaker, CircuitBreakerError } from '../../src/shared/utils/CircuitBreaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000
    });
  });

  describe('Initialization', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should use default options when not provided', () => {
      const defaultBreaker = new CircuitBreaker();
      expect(defaultBreaker.getState()).toBe('CLOSED');
    });

    it('should accept custom options', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 10,
        successThreshold: 5,
        timeout: 5000
      });

      expect(customBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('State Transitions', () => {
    it('should stay CLOSED on successful executions', async () => {
      const fn = async () => 'success';

      await breaker.execute(fn);
      await breaker.execute(fn);
      await breaker.execute(fn);

      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should open after threshold failures', async () => {
      const failingFn = async () => {
        throw new Error('Failure');
      };

      // Trigger 3 failures (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failingFn);
        } catch (e) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      const failingFn = async () => {
        throw new Error('Failure');
      };

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failingFn);
        } catch (e) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Attempt execution should transition to HALF_OPEN
      try {
        await breaker.execute(async () => 'test');
      } catch (e) {
        // May succeed or fail
      }

      // Should be HALF_OPEN after attempting
      const state = breaker.getState();
      expect(state === 'HALF_OPEN' || state === 'CLOSED').toBe(true);
    });

    it('should close on successful execution in HALF_OPEN state', async () => {
      const successFn = async () => 'success';

      // First, open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch (e) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Execute successful operations to close circuit
      // Need successThreshold (2) successes
      await breaker.execute(successFn);
      await breaker.execute(successFn);

      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should reopen on failure in HALF_OPEN state', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch (e) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Fail again in HALF_OPEN
      try {
        await breaker.execute(async () => {
          throw new Error('fail again');
        });
      } catch (e) {
        // Expected
      }

      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('Execution', () => {
    it('should execute function when CLOSED', async () => {
      const fn = async () => 'success';
      const result = await breaker.execute(fn);
      expect(result).toBe('success');
    });

    it('should pass through function result', async () => {
      const fn = async () => ({ data: 'test', value: 123 });
      const result = await breaker.execute(fn);
      expect(result).toEqual({ data: 'test', value: 123 });
    });

    it('should reject immediately when OPEN', async () => {
      // Open the circuit
      const failingFn = async () => {
        throw new Error('Failure');
      };

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failingFn);
        } catch (e) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');

      // Try to execute - should fail immediately
      await expect(breaker.execute(async () => 'test'))
        .rejects.toThrow(CircuitBreakerError);
    });

    it('should throw CircuitBreakerError when OPEN', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch (e) {
          // Expected
        }
      }

      await expect(breaker.execute(async () => 'test'))
        .rejects.toThrow(CircuitBreakerError);

      try {
        await breaker.execute(async () => 'test');
      } catch (error) {
        expect((error as CircuitBreakerError).state).toBe('OPEN');
      }
    });

    it('should propagate original error when CLOSED', async () => {
      const customError = new Error('Custom error');
      const fn = async () => {
        throw customError;
      };

      await expect(breaker.execute(fn))
        .rejects.toThrow(customError);
    });
  });

  describe('Statistics', () => {
    it('should track failure count', async () => {
      const failingFn = async () => {
        throw new Error('Failure');
      };

      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failingFn);
        } catch (e) {
          // Expected
        }
      }

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(2);
    });

    it('should reset failure count on success', async () => {
      // Fail twice
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch (e) {
          // Expected
        }
      }

      expect(breaker.getStats().failureCount).toBe(2);

      // Succeed once
      await breaker.execute(async () => 'success');

      // Failure count should reset
      expect(breaker.getStats().failureCount).toBe(0);
    });

    it('should track last failure time', async () => {
      const before = new Date();

      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch (e) {
        // Expected
      }

      const after = new Date();
      const stats = breaker.getStats();

      expect(stats.lastFailureTime).toBeDefined();
      expect(stats.lastFailureTime!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(stats.lastFailureTime!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should set next attempt time when OPEN', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch (e) {
          // Expected
        }
      }

      const stats = breaker.getStats();
      expect(stats.nextAttemptTime).toBeDefined();
      expect(stats.nextAttemptTime!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Reset', () => {
    it('should reset to CLOSED state', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch (e) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');

      breaker.reset();

      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should clear all statistics', async () => {
      // Fail a few times
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch (e) {
          // Expected
        }
      }

      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.lastFailureTime).toBeUndefined();
      expect(stats.nextAttemptTime).toBeUndefined();
    });
  });

  describe('State Change Callback', () => {
    it('should call onStateChange when state transitions', async () => {
      const stateChanges: Array<{ from: string; to: string }> = [];

      const callbackBreaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 1000,
        onStateChange: (oldState, newState) => {
          stateChanges.push({ from: oldState, to: newState });
        }
      });

      // Trigger failures to open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await callbackBreaker.execute(async () => {
            throw new Error('fail');
          });
        } catch (e) {
          // Expected
        }
      }

      expect(stateChanges).toContainEqual({ from: 'CLOSED', to: 'OPEN' });
    });
  });
});
