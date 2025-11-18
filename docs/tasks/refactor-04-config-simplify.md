# 🔧 Refactor 04: Simplify ConfigManager

> **Priority:** HIGH
> **Can Run in Parallel:** ✅ YES (with Refactor 05, 06)
> **Estimated Time:** 1-2 hours
> **Status:** 📋 Pending

---

## 🎯 Objective

Replace the `ConfigManager` class with a simple plain object approach. The current implementation is over-engineered for what is essentially a thin wrapper around Claude Code.

**Before:** ConfigManager class with validation, getters, setters
**After:** Plain object with defaults and a simple helper function

---

## 📋 Current Problems

1. **Over-engineering:** Full class with validation for simple config
2. **Unnecessary abstraction:** get(), set(), getAll() methods
3. **Complex validation:** Extensive validation for a wrapper CLI
4. **Hard to use:** Requires understanding of ConfigManager API

**Current file:** `src/features/orchestration/ConfigManager.ts` (~163 lines)

---

## ✅ Implementation Steps

### Step 1: Create Simple Config Module

**File:** `src/shared/config/MaestroConfig.ts` (NEW)

```typescript
/**
 * Simple configuration for AgentMaestro
 * No class, no validation - just defaults and types
 */

export interface MaestroConfig {
  inactivityTimeout: number;
  showSpinner: boolean;
  verbose: boolean;
  planMode: boolean;
  interactive: boolean;

  // Logging
  enableFileLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logDirectory: string;
  logRotation: boolean;
  maxLogFiles: number;
  maxLogSizeBytes: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: MaestroConfig = {
  inactivityTimeout: 60000,
  showSpinner: true,
  verbose: false,
  planMode: false,
  interactive: false,

  enableFileLogging: false,
  logLevel: 'info',
  logDirectory: './logs',
  logRotation: true,
  maxLogFiles: 5,
  maxLogSizeBytes: 10 * 1024 * 1024, // 10MB
};

/**
 * Merge user config with defaults
 */
export function createConfig(userConfig?: Partial<MaestroConfig>): MaestroConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };
}
```

### Step 2: Update Maestro.ts

Replace:
```typescript
this.config = config instanceof ConfigManager
  ? config
  : new ConfigManager(config);
```

With:
```typescript
this.config = typeof config === 'object' && 'inactivityTimeout' in config
  ? config
  : createConfig(config);
```

Replace all `this.config.get('key')` with `this.config.key`

### Step 3: Update StartCommand.ts

Replace:
```typescript
const config = {
  inactivityTimeout: parseInt(options.timeout || TIMEOUTS.DEFAULT_INACTIVITY.toString()),
  // ...
};
```

With:
```typescript
const config = createConfig({
  inactivityTimeout: parseInt(options.timeout || TIMEOUTS.DEFAULT_INACTIVITY.toString()),
  // ...
});
```

### Step 4: Update All Usages

Find and replace across codebase:
- `this.config.get('planMode')` → `this.config.planMode`
- `this.config.set('planMode', value)` → `this.config.planMode = value`
- `this.config.getAll()` → `this.config`

Search for: `config.get(` and `config.set(`

### Step 5: Remove Old Files

Delete:
- `src/features/orchestration/ConfigManager.ts`
- Update `src/features/orchestration/index.ts` exports

### Step 6: Update Tests

**File:** `tests/unit/ConfigManager.test.ts`

Simplify to test `createConfig()` function instead of class:

```typescript
import { createConfig, DEFAULT_CONFIG } from '../../src/shared/config/MaestroConfig.js';

describe('Config Creation', () => {
  it('should use defaults when no config provided', () => {
    const config = createConfig();
    expect(config.showSpinner).toBe(true);
    expect(config.verbose).toBe(false);
  });

  it('should merge user config with defaults', () => {
    const config = createConfig({ verbose: true });
    expect(config.verbose).toBe(true);
    expect(config.showSpinner).toBe(true); // default
  });

  it('should allow overriding all values', () => {
    const config = createConfig({
      verbose: true,
      showSpinner: false,
      planMode: true,
    });
    expect(config.verbose).toBe(true);
    expect(config.showSpinner).toBe(false);
    expect(config.planMode).toBe(true);
  });
});
```

---

## 🧪 Testing Requirements

### Must Pass:
```bash
npm test
# All 253 tests must pass
```

### Verify:
```bash
npm run build
# No TypeScript errors
```

### Manual Test:
```bash
node dist/cli/index.js --help
# Should show help without errors

node dist/cli/index.js list
# Should list agents
```

---

## 📝 Files to Modify

1. **NEW:** `src/shared/config/MaestroConfig.ts`
2. **MODIFY:** `src/features/orchestration/Maestro.ts`
3. **MODIFY:** `src/cli/commands/StartCommand.ts`
4. **MODIFY:** `tests/unit/ConfigManager.test.ts`
5. **DELETE:** `src/features/orchestration/ConfigManager.ts`
6. **UPDATE:** `src/features/orchestration/index.ts`

**Estimated Changes:**
- +80 lines (new simple config)
- -163 lines (old ConfigManager)
- Net: **-83 lines**

---

## ✅ Completion Checklist

- [ ] Create `src/shared/config/MaestroConfig.ts`
- [ ] Update `Maestro.ts` to use plain config
- [ ] Update `StartCommand.ts` to use `createConfig()`
- [ ] Find and replace all `.get()` and `.set()` calls
- [ ] Update tests to test plain object
- [ ] Delete `ConfigManager.ts`
- [ ] Run `npm test` - all pass
- [ ] Run `npm run build` - success
- [ ] Manual smoke test
- [ ] Commit changes
- [ ] **DELETE THIS FILE**
- [ ] Update `docs/REFACTORING_TASKS.md` status to ✅

---

## 🎯 Success Criteria

- ✅ No ConfigManager class exists
- ✅ Plain object with createConfig() helper
- ✅ All tests pass (253/253)
- ✅ TypeScript builds without errors
- ✅ Code is simpler and more readable
- ✅ ~80 lines removed from codebase

---

## 🚨 Important Notes

- **Validation:** We're removing validation intentionally - this is a CLI wrapper, not a library
- **Type Safety:** TypeScript provides type checking at compile time
- **Defaults:** Keep all existing defaults unchanged
- **Backward Compatibility:** Config API usage in Maestro should stay similar

---

**When done, delete this file and update REFACTORING_TASKS.md** ✅
