# Task 03: Environment Variable Filtering

> **Priority:** HIGH
> **Estimated Time:** 2 hours
> **Files to Modify:**
> - `src/features/execution/pty/PTYSpawner.ts`
> - `src/shared/constants/environment.ts` (new)
> - `tests/unit/PTYSpawner.test.ts` (new)

---

## 🎯 Objective

Filter environment variables passed to PTY processes to prevent exposure of sensitive information like API keys, tokens, and credentials.

---

## 📋 Current Problem

PTYSpawner passes ALL environment variables to spawned processes:

```typescript
// src/features/execution/pty/PTYSpawner.ts:29-36
private buildOptions(options: PTYOptions): pty.IPtyForkOptions {
  return {
    name: options.name || 'xterm-color',
    cols: options.cols || process.stdout.columns || 80,
    rows: options.rows || process.stdout.rows || 30,
    cwd: options.cwd || process.cwd(),
    env: options.env || process.env  // ⚠️ Exposes ALL env vars!
  };
}
```

**Risk:**
- API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.) exposed to child processes
- Credentials leaked to potentially untrusted AI agents
- Secrets visible in process listings
- Compliance violations (PCI, HIPAA, GDPR)

---

## ✅ Implementation Requirements

### 1. Create Environment Constants

**File:** `src/shared/constants/environment.ts`

```typescript
/**
 * Environment variable filtering configuration
 */

/**
 * Safe environment variables that can be passed to PTY processes
 * These are essential for CLI tools to function properly
 */
export const SAFE_ENV_ALLOWLIST: readonly string[] = [
  // Essential system variables
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'TERM',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'PWD',
  'TMPDIR',
  'TMP',
  'TEMP',

  // Display and terminal
  'DISPLAY',
  'COLORTERM',
  'TERM_PROGRAM',
  'TERM_PROGRAM_VERSION',

  // Node.js specific (needed for npm, etc.)
  'NODE_ENV',
  'NODE_PATH',
  'npm_config_user_agent',

  // Editor preferences
  'EDITOR',
  'VISUAL',

  // Locale
  'LANGUAGE',

  // Platform-specific
  'OS',
  'PROCESSOR_ARCHITECTURE',
  'SYSTEMROOT', // Windows
  'windir', // Windows
] as const;

/**
 * Sensitive environment variable patterns that should NEVER be passed
 * These are additional safeguards beyond the allowlist
 */
export const SENSITIVE_ENV_PATTERNS: readonly RegExp[] = [
  /API_KEY$/i,
  /SECRET$/i,
  /TOKEN$/i,
  /PASSWORD$/i,
  /CREDENTIAL$/i,
  /PRIVATE_KEY$/i,
  /AUTH.*KEY$/i,
  /^AWS_/i,
  /^AZURE_/i,
  /^GCP_/i,
  /^GITHUB_TOKEN$/i,
  /^NPM_TOKEN$/i,
  /^ANTHROPIC_/i,
  /^OPENAI_/i,
  /^GEMINI_/i,
] as const;

/**
 * Additional environment variables that might be needed for specific CLIs
 * Users can customize this list based on their needs
 */
export const OPTIONAL_SAFE_ENV: readonly string[] = [
  'SSH_AUTH_SOCK', // For git operations with SSH
  'GIT_AUTHOR_NAME',
  'GIT_AUTHOR_EMAIL',
  'GIT_COMMITTER_NAME',
  'GIT_COMMITTER_EMAIL',
] as const;
```

### 2. Update PTYSpawner Class

**File:** `src/features/execution/pty/PTYSpawner.ts`

```typescript
import {
  SAFE_ENV_ALLOWLIST,
  SENSITIVE_ENV_PATTERNS,
  OPTIONAL_SAFE_ENV
} from '../../../shared/constants/environment.js';

export class PTYSpawner {
  private includeOptionalEnv: boolean;

  constructor(includeOptionalEnv: boolean = false) {
    this.includeOptionalEnv = includeOptionalEnv;
  }

  /**
   * Build PTY spawn options with filtered environment
   */
  private buildOptions(options: PTYOptions): pty.IPtyForkOptions {
    return {
      name: options.name || 'xterm-color',
      cols: options.cols || process.stdout.columns || 80,
      rows: options.rows || process.stdout.rows || 30,
      cwd: options.cwd || process.cwd(),
      env: options.env || this.getFilteredEnvironment()
    };
  }

  /**
   * Get filtered environment variables safe for PTY processes
   * @returns Filtered environment object
   */
  private getFilteredEnvironment(): NodeJS.ProcessEnv {
    const safeEnv: NodeJS.ProcessEnv = {};
    const allowedKeys = new Set([
      ...SAFE_ENV_ALLOWLIST,
      ...(this.includeOptionalEnv ? OPTIONAL_SAFE_ENV : [])
    ]);

    // Copy allowed variables
    for (const key of allowedKeys) {
      if (process.env[key] !== undefined) {
        safeEnv[key] = process.env[key];
      }
    }

    // Double-check: remove any sensitive variables that might have slipped through
    this.removeSensitiveVariables(safeEnv);

    return safeEnv;
  }

  /**
   * Remove sensitive environment variables based on patterns
   * @param env - Environment object to filter
   */
  private removeSensitiveVariables(env: NodeJS.ProcessEnv): void {
    const keysToRemove: string[] = [];

    for (const key in env) {
      for (const pattern of SENSITIVE_ENV_PATTERNS) {
        if (pattern.test(key)) {
          keysToRemove.push(key);
          console.warn(
            `[PTYSpawner] Removing sensitive environment variable: ${key}`
          );
          break;
        }
      }
    }

    // Remove identified sensitive keys
    for (const key of keysToRemove) {
      delete env[key];
    }
  }

  /**
   * Validate that environment is safe (for debugging)
   * @param env - Environment to validate
   * @returns Array of warnings about potentially unsafe variables
   */
  validateEnvironmentSafety(env: NodeJS.ProcessEnv): string[] {
    const warnings: string[] = [];

    for (const key in env) {
      // Check against allowlist
      if (
        !SAFE_ENV_ALLOWLIST.includes(key) &&
        !(this.includeOptionalEnv && OPTIONAL_SAFE_ENV.includes(key))
      ) {
        warnings.push(`Non-allowlisted variable: ${key}`);
      }

      // Check against sensitive patterns
      for (const pattern of SENSITIVE_ENV_PATTERNS) {
        if (pattern.test(key)) {
          warnings.push(`Potentially sensitive variable: ${key}`);
          break;
        }
      }
    }

    return warnings;
  }

  /**
   * Get environment statistics for logging
   * @returns Environment stats
   */
  getEnvironmentStats(): {
    totalSystemVars: number;
    allowedVars: number;
    filteredVars: number;
  } {
    const totalSystemVars = Object.keys(process.env).length;
    const filtered = this.getFilteredEnvironment();
    const allowedVars = Object.keys(filtered).length;
    const filteredVars = totalSystemVars - allowedVars;

    return {
      totalSystemVars,
      allowedVars,
      filteredVars
    };
  }
}
```

### 3. Add Logging on Spawn

Update the `spawn` method to log environment filtering:

```typescript
spawn(command: string, args: string[], options: PTYOptions = {}): IPty {
  // Log environment filtering stats
  const envStats = this.getEnvironmentStats();
  console.log(
    `[PTYSpawner] Environment filtering: ` +
    `${envStats.allowedVars} allowed, ${envStats.filteredVars} filtered ` +
    `(total: ${envStats.totalSystemVars})`
  );

  // ... rest of existing spawn logic
}
```

### 4. Update Constants Export

**File:** `src/shared/constants/index.ts`

```typescript
export * from './environment.js';
```

### 5. Create Unit Tests

**File:** `tests/unit/PTYSpawner.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { PTYSpawner } from '../../src/features/execution/pty/PTYSpawner.js';

describe('PTYSpawner', () => {
  let spawner: PTYSpawner;

  beforeEach(() => {
    spawner = new PTYSpawner();
  });

  describe('Environment Filtering', () => {
    it('should include safe environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        PATH: '/usr/bin',
        HOME: '/home/user',
        USER: 'testuser',
        SHELL: '/bin/bash',
      };

      const stats = spawner.getEnvironmentStats();
      expect(stats.allowedVars).toBe(4);
      expect(stats.filteredVars).toBe(0);

      process.env = originalEnv;
    });

    it('should filter out API keys', () => {
      const originalEnv = process.env;
      process.env = {
        PATH: '/usr/bin',
        OPENAI_API_KEY: 'sk-test123',
        ANTHROPIC_API_KEY: 'sk-ant-test456',
      };

      const stats = spawner.getEnvironmentStats();
      expect(stats.filteredVars).toBeGreaterThan(0);

      process.env = originalEnv;
    });

    it('should filter out tokens', () => {
      const originalEnv = process.env;
      process.env = {
        PATH: '/usr/bin',
        GITHUB_TOKEN: 'ghp_test123',
        NPM_TOKEN: 'npm_test456',
      };

      const stats = spawner.getEnvironmentStats();
      expect(stats.filteredVars).toBeGreaterThan(0);

      process.env = originalEnv;
    });

    it('should filter out secrets and passwords', () => {
      const originalEnv = process.env;
      process.env = {
        PATH: '/usr/bin',
        DATABASE_PASSWORD: 'secret123',
        AWS_SECRET: 'aws-secret',
      };

      const stats = spawner.getEnvironmentStats();
      expect(stats.filteredVars).toBeGreaterThan(0);

      process.env = originalEnv;
    });

    it('should warn about sensitive variables', () => {
      const env = {
        PATH: '/usr/bin',
        DANGEROUS_API_KEY: 'test123',
      };

      const warnings = spawner.validateEnvironmentSafety(env);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('API_KEY'))).toBe(true);
    });

    it('should include optional env vars when enabled', () => {
      const spawnerWithOptional = new PTYSpawner(true);
      const originalEnv = process.env;

      process.env = {
        PATH: '/usr/bin',
        SSH_AUTH_SOCK: '/tmp/ssh-agent.sock',
        GIT_AUTHOR_NAME: 'Test User',
      };

      const stats = spawnerWithOptional.getEnvironmentStats();
      expect(stats.allowedVars).toBeGreaterThan(1);

      process.env = originalEnv;
    });

    it('should not include optional env vars when disabled', () => {
      const spawnerNoOptional = new PTYSpawner(false);
      const originalEnv = process.env;

      process.env = {
        PATH: '/usr/bin',
        SSH_AUTH_SOCK: '/tmp/ssh-agent.sock',
      };

      const stats = spawnerNoOptional.getEnvironmentStats();
      // SSH_AUTH_SOCK should be filtered out
      expect(stats.filteredVars).toBeGreaterThan(0);

      process.env = originalEnv;
    });
  });

  describe('Validation', () => {
    it('should detect non-allowlisted variables', () => {
      const env = {
        PATH: '/usr/bin',
        CUSTOM_VAR: 'value',
      };

      const warnings = spawner.validateEnvironmentSafety(env);
      expect(warnings.some(w => w.includes('Non-allowlisted'))).toBe(true);
    });

    it('should pass validation for safe environment', () => {
      const env = {
        PATH: '/usr/bin',
        HOME: '/home/user',
        SHELL: '/bin/bash',
      };

      const warnings = spawner.validateEnvironmentSafety(env);
      expect(warnings.length).toBe(0);
    });
  });
});
```

---

## 🧪 Testing Instructions

1. **Run unit tests:**
   ```bash
   npm run test -- PTYSpawner.test.ts
   ```

2. **Manual testing:**
   ```bash
   # Set some sensitive env vars
   export OPENAI_API_KEY="sk-test123"
   export MY_SECRET_TOKEN="secret456"

   # Run maestro with verbose logging
   maestro --verbose -m "echo $OPENAI_API_KEY"

   # Check console output - should see env filtering stats
   # Verify sensitive vars are NOT accessible in spawned process
   ```

3. **Security verification:**
   ```bash
   # The spawned process should NOT see sensitive vars
   maestro -m "env | grep API_KEY"
   # Should return empty or not found
   ```

---

## ✅ Acceptance Criteria

- [ ] Environment constants defined (allowlist + patterns)
- [ ] PTYSpawner filters environment variables
- [ ] Sensitive variables are removed (API keys, tokens, secrets)
- [ ] Safe variables are preserved (PATH, HOME, etc.)
- [ ] Optional variables can be included via flag
- [ ] Logging shows filtering statistics
- [ ] All unit tests passing
- [ ] Manual verification confirms no leaks
- [ ] TypeScript compilation successful

---

## 📝 Completion Steps

1. Implement all code changes
2. Run all tests and verify they pass
3. Manually verify with sensitive env vars
4. Check logs show proper filtering
5. Update PTYManager constructor if needed to pass includeOptionalEnv flag
6. Commit changes: `git commit -m "security: Filter environment variables in PTY processes (Task 03)"`
7. Delete this task file: `rm docs/tasks/task-03-env-filtering.md`
8. Update `docs/TASKS_MASTER.md` with completion status

---

## 🔗 Related Tasks

- Task 01: Input Validation (related security improvement)
- Task 08: Comprehensive Test Suite

---

**Let's secure those environment variables! 🔐**
