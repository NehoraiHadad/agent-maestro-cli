# Task 08: Comprehensive Test Suite

> **Priority:** CRITICAL
> **Estimated Time:** 2-3 days
> **Files to Create:**
> - `tests/unit/*.test.ts` (multiple files)
> - `tests/integration/*.test.ts` (multiple files)
> - `tests/setup.ts`
> - `jest.config.js`
> - Update `package.json` with test scripts

---

## 🎯 Objective

Implement a comprehensive test suite with unit tests for all core components and integration tests for end-to-end workflows. Achieve 80%+ code coverage for critical paths.

---

## 📋 Current Problem

Minimal test coverage - only basic compilation tests exist:

```typescript
// tests/test-basic.ts
async function testBasic(): Promise<void> {
  console.log('✓ Testing basic Maestro compilation...');
  const maestro = Maestro.create({ verbose: true, showSpinner: false });
  // ... no actual tests
}
```

**Missing Tests:**
- PTYManager (process lifecycle, cleanup)
- SessionManager (session continuity)
- ConfigManager (validation)
- StreamProcessor (parsing)
- CircuitBreaker (state transitions)
- RetryManager (exponential backoff)
- Error classes
- All new components from Tasks 01-07

---

## ✅ Implementation Requirements

### 1. Setup Jest Configuration

**File:** `jest.config.js`

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext',
        moduleResolution: 'node',
      }
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.types.ts',
    '!src/**/*.d.ts',
    '!src/cli/index.ts', // Entry point
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  verbose: true
};
```

### 2. Test Setup File

**File:** `tests/setup.ts`

```typescript
/**
 * Global test setup
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Global test timeout
jest.setTimeout(10000);
```

### 3. Update package.json

**File:** `package.json`

```json
{
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:watch": "npm run test -- --watch",
    "test:coverage": "npm run test -- --coverage",
    "test:unit": "npm run test -- tests/unit",
    "test:integration": "npm run test -- tests/integration",
    "test:ci": "npm run test -- --ci --coverage --maxWorkers=2"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/inquirer": "^9.0.0",
    "@types/node": "^20.19.25",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0"
  }
}
```

Install test dependencies:
```bash
npm install --save-dev jest @types/jest ts-jest
```

### 4. Unit Tests - Core Components

#### ConfigManager Tests

**File:** `tests/unit/ConfigManager.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConfigManager } from '../../src/features/orchestration/ConfigManager.js';

describe('ConfigManager', () => {
  describe('Validation', () => {
    it('should accept valid configuration', () => {
      const config = new ConfigManager({
        verbose: true,
        showSpinner: false,
        inactivityTimeout: 30000,
        logDirectory: './logs'
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should reject negative inactivity timeout', () => {
      const config = new ConfigManager({ inactivityTimeout: -1000 });
      expect(() => config.validate()).toThrow(/inactivityTimeout must be greater than 0/);
    });

    it('should reject zero timeout', () => {
      const config = new ConfigManager({ inactivityTimeout: 0 });
      expect(() => config.validate()).toThrow(/inactivityTimeout must be greater than 0/);
    });

    it('should reject empty log directory', () => {
      const config = new ConfigManager({ logDirectory: '' });
      expect(() => config.validate()).toThrow(/logDirectory must be a non-empty string/);
    });

    it('should reject non-string log directory', () => {
      const config = new ConfigManager({ logDirectory: 123 as any });
      expect(() => config.validate()).toThrow(/logDirectory must be a non-empty string/);
    });
  });

  describe('Get/Set', () => {
    it('should get configuration value', () => {
      const config = new ConfigManager({ verbose: true });
      expect(config.get('verbose')).toBe(true);
    });

    it('should set configuration value', () => {
      const config = new ConfigManager({ verbose: false });
      config.set('verbose', true);
      expect(config.get('verbose')).toBe(true);
    });

    it('should return default values', () => {
      const config = new ConfigManager({});
      const defaults = ConfigManager.getDefaults();
      expect(config.get('inactivityTimeout')).toBe(defaults.inactivityTimeout);
    });
  });

  describe('Merge', () => {
    it('should merge partial configuration', () => {
      const config = new ConfigManager({ verbose: false });
      config.merge({ verbose: true, showSpinner: false });

      expect(config.get('verbose')).toBe(true);
      expect(config.get('showSpinner')).toBe(false);
    });
  });
});
```

#### SessionManager Tests

**File:** `tests/unit/SessionManager.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { SessionManager } from '../../src/features/orchestration/SessionManager.js';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('Session Creation', () => {
    it('should create new session', () => {
      const sessionId = sessionManager.createSession('claude');

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should return different IDs for different sessions', () => {
      const id1 = sessionManager.createSession('claude');
      const id2 = sessionManager.createSession('claude');

      expect(id1).not.toBe(id2);
    });
  });

  describe('Session Retrieval', () => {
    it('should retrieve existing session', () => {
      const sessionId = sessionManager.createSession('claude');
      const retrieved = sessionManager.getSession(sessionId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.agentName).toBe('claude');
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = sessionManager.getSession('non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Session Management', () => {
    it('should check if session exists', () => {
      const sessionId = sessionManager.createSession('claude');

      expect(sessionManager.hasSession(sessionId)).toBe(true);
      expect(sessionManager.hasSession('non-existent')).toBe(false);
    });

    it('should delete session', () => {
      const sessionId = sessionManager.createSession('claude');

      expect(sessionManager.deleteSession(sessionId)).toBe(true);
      expect(sessionManager.hasSession(sessionId)).toBe(false);
    });

    it('should return false when deleting non-existent session', () => {
      expect(sessionManager.deleteSession('non-existent')).toBe(false);
    });

    it('should clear all sessions', () => {
      sessionManager.createSession('claude');
      sessionManager.createSession('gemini');

      sessionManager.clearAll();

      expect(sessionManager.getAllSessions()).toHaveLength(0);
    });
  });
});
```

#### CircuitBreaker Tests

**File:** `tests/unit/CircuitBreaker.test.ts`

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CircuitBreaker } from '../../src/shared/utils/CircuitBreaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000
    });
  });

  describe('State Transitions', () => {
    it('should start in closed state', () => {
      expect(breaker.getState()).toBe('closed');
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

      expect(breaker.getState()).toBe('open');
    });

    it('should transition to half-open after timeout', async () => {
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

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(breaker.getState()).toBe('half-open');
    });

    it('should close on successful execution in half-open state', async () => {
      // ... implementation
    });
  });

  describe('Execution', () => {
    it('should execute function when closed', async () => {
      const fn = async () => 'success';
      const result = await breaker.execute(fn);
      expect(result).toBe('success');
    });

    it('should reject immediately when open', async () => {
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

      // Try to execute - should fail immediately
      await expect(breaker.execute(async () => 'test'))
        .rejects.toThrow(/Circuit breaker is open/);
    });
  });
});
```

#### RetryManager Tests

**File:** `tests/unit/RetryManager.test.ts`

```typescript
import { describe, it, expect, jest } from '@jest/globals';
import { RetryManager } from '../../src/shared/utils/RetryManager.js';

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager();
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
      const fn = async () => {
        throw new Error('Always fail');
      };

      await expect(
        retryManager.executeWithRetry(fn, { maxRetries: 2, baseDelay: 10 })
      ).rejects.toThrow('Always fail');
    });

    it('should use exponential backoff', async () => {
      const delays: number[] = [];
      let attempt = 0;

      const fn = async () => {
        attempt++;
        if (attempt < 3) {
          const start = Date.now();
          throw new Error('Retry');
        }
        return 'done';
      };

      // Mock delays to track timing
      const originalDelay = retryManager['delay'];
      retryManager['delay'] = async (ms: number) => {
        delays.push(ms);
        await originalDelay.call(retryManager, ms);
      };

      await retryManager.executeWithRetry(fn, {
        maxRetries: 3,
        baseDelay: 100,
        exponential: true
      });

      // Verify exponential growth: 100, 200, 400, etc.
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBeGreaterThan(delays[0]);
    });
  });
});
```

### 5. Integration Tests

#### Full Orchestration Flow

**File:** `tests/integration/orchestration.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Maestro } from '../../src/features/orchestration/Maestro.js';

describe('Orchestration Integration', () => {
  let maestro: Maestro;

  beforeEach(async () => {
    maestro = Maestro.create({
      verbose: false,
      showSpinner: false,
      inactivityTimeout: 5000
    });
    await maestro.start();
  });

  afterEach(async () => {
    await maestro.stop();
  });

  it('should handle complete message flow', async () => {
    // This test requires claude CLI to be installed
    // Skip if not available
    // TODO: Add mock mode for testing without actual CLI
  }, 15000);

  it('should maintain session continuity', async () => {
    // TODO: Test session persistence across multiple messages
  });

  it('should recover from agent failures', async () => {
    // TODO: Test error recovery
  });
});
```

---

## 🧪 Testing Instructions

### Install Dependencies

```bash
npm install --save-dev jest @types/jest ts-jest
```

### Run Tests

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Check Coverage

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## ✅ Acceptance Criteria

### Unit Tests
- [ ] ConfigManager (100% coverage)
- [ ] SessionManager (100% coverage)
- [ ] PTYLifecycle (90%+ coverage)
- [ ] PTYEventEmitter (90%+ coverage)
- [ ] CircuitBreaker (100% coverage)
- [ ] RetryManager (100% coverage)
- [ ] MetricsCollector (90%+ coverage)
- [ ] InputValidator (100% coverage)
- [ ] All error classes (100% coverage)

### Integration Tests
- [ ] End-to-end message flow
- [ ] Session continuity
- [ ] Error recovery
- [ ] PTY process lifecycle

### Overall
- [ ] 80%+ line coverage
- [ ] 75%+ function coverage
- [ ] 70%+ branch coverage
- [ ] All tests passing
- [ ] Fast execution (<30s for unit tests)
- [ ] CI-ready configuration

---

## 📊 Test Coverage Targets

| Component | Target Coverage | Priority |
|-----------|----------------|----------|
| ConfigManager | 100% | HIGH |
| SessionManager | 100% | HIGH |
| PTYLifecycle | 90% | HIGH |
| CircuitBreaker | 100% | HIGH |
| RetryManager | 100% | HIGH |
| MetricsCollector | 90% | MEDIUM |
| InputValidator | 100% | CRITICAL |
| Error Classes | 100% | HIGH |
| StreamProcessor | 85% | MEDIUM |
| UI Components | 70% | LOW |

---

## 📝 Completion Steps

1. Install Jest and dependencies
2. Create jest.config.js and setup file
3. Update package.json with test scripts
4. Create unit tests for all core components
5. Create integration tests for workflows
6. Run tests and fix any failures
7. Generate coverage report
8. Ensure 80%+ coverage achieved
9. Document test patterns in README
10. Commit changes: `git commit -m "test: Add comprehensive test suite (Task 08)"`
11. Delete this task file: `rm docs/tasks/task-08-test-suite.md`
12. Update `docs/TASKS_MASTER.md` with completion status

---

## 🔗 Related Tasks

All tasks (01-07) should have corresponding tests added in this task.

---

## 💡 Testing Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **One assertion per test** (when possible)
3. **Descriptive test names** that explain what is being tested
4. **Mock external dependencies** (filesystem, network, etc.)
5. **Test both success and failure paths**
6. **Use beforeEach for setup**, afterEach for cleanup
7. **Avoid test interdependence**
8. **Keep tests fast** (<1s per test when possible)

---

**Let's achieve that 80%+ coverage! 🎯**
