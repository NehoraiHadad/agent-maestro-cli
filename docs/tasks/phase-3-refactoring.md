# Phase 3: Architectural Refactoring 🏗️

**Execution Mode:** ⚠️ **SEQUENTIAL** - Tasks MUST run in order (3.1 → 3.2 → 3.3 → 3.4)
**Estimated Time:** ~15 minutes
**Dependencies:** Phase 2 must be completed first

---

## ⚠️ CRITICAL INSTRUCTIONS

1. **DO NOT RUN IN PARALLEL** - Tasks depend on each other
2. **Run tasks in exact order:** 3.1 → 3.2 → 3.3 → 3.4
3. After EACH task, verify it compiles before proceeding
4. After ALL tasks complete, run full build
5. Update `docs/IMPLEMENTATION_TRACKER.md` when done
6. **DELETE THIS FILE** after all tasks are completed and verified

---

## Task 3.1: Use SessionIdExtractor in Maestro

**File:** `src/features/orchestration/Maestro.ts`
**Order:** 🥇 FIRST

### Step 1: Add import (at top of file)

```typescript
import { SessionIdExtractor } from './SessionIdExtractor.js';
```

### Step 2: Add property (after line 36)

```typescript
private sessionIdExtractor: SessionIdExtractor;
```

### Step 3: Initialize in constructor (after line 64)

```typescript
this.sessionIdExtractor = new SessionIdExtractor();
```

### Step 4: Replace tryExtractSessionId method (lines 384-415)

```typescript
/**
 * Try to extract Session ID from streaming output
 * Called during streaming to catch Session ID as early as possible
 */
private tryExtractSessionId(data: string): void {
  const extractedSessionId = this.sessionIdExtractor.extract(data);

  if (extractedSessionId) {
    const currentSession = this.sessionManager.getCliSession(this.primaryAgent.name);

    // Only update if we don't have a session ID yet or if it's different
    if (!currentSession?.sessionId || currentSession.sessionId !== extractedSessionId) {
      this.loggingManager.debug('Maestro', `Extracted Session ID during streaming: ${extractedSessionId}`);

      this.sessionManager.setCliSession(this.primaryAgent.name, {
        sessionId: extractedSessionId,
        isActive: true
      });
    }
  }
}
```

### Step 5: Replace Session ID extraction in onExit (lines 244-277)

Find this section in the `onExit` handler and replace:

```typescript
// Try extracting Session ID one final time from complete output
const currentSession = this.sessionManager.getCliSession(this.primaryAgent.name);
if (!currentSession?.sessionId) {
  const extractedSessionId = this.sessionIdExtractor.extract(output);

  if (extractedSessionId) {
    this.loggingManager.debug('Maestro', `Extracted Session ID in onExit: ${extractedSessionId}`);
    this.loggingManager.info('Maestro', `Session ID detected: ${extractedSessionId}`);

    // Update session with the actual session ID
    this.sessionManager.setCliSession(this.primaryAgent.name, {
      sessionId: extractedSessionId,
      isActive: true
    });
  } else if (this.config.get('verbose')) {
    this.loggingManager.debug('Maestro', 'No session ID found in final output');
  }
} else if (this.config.get('verbose')) {
  this.loggingManager.debug('Maestro', `Session ID already captured: ${currentSession.sessionId}`);
}
```

### Verification:
- [ ] SessionIdExtractor imported
- [ ] Property declared
- [ ] Initialized in constructor
- [ ] tryExtractSessionId simplified
- [ ] onExit Session ID extraction simplified
- [ ] No duplicate regex patterns
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Task 3.2: Use TIMEOUTS Constants

**Files:** Multiple files
**Order:** 🥈 SECOND (after 3.1)

### File 1: `src/cli/commands/StartCommand.ts`

**Step 1:** Add import at top:
```typescript
import { TIMEOUTS } from '../../shared/constants/index.js';
```

**Step 2:** Replace line 34:
```typescript
.option('--timeout <ms>', 'inactivity timeout in milliseconds', TIMEOUTS.DEFAULT_INACTIVITY.toString())
```

**Step 3:** Replace line 59:
```typescript
inactivityTimeout: parseInt(options.timeout || TIMEOUTS.DEFAULT_INACTIVITY.toString()),
```

**Step 4:** Replace line 130 (inside setTimeout):
```typescript
setTimeout(() => {
  process.kill();
  resolve(false);
}, TIMEOUTS.COMMAND_AVAILABILITY_CHECK);
```

### File 2: `src/shared/constants/logging.ts`

Add import and update constant:
```typescript
import { TIMEOUTS } from './timeouts.js';

export const DEFAULT_INACTIVITY_TIMEOUT = TIMEOUTS.DEFAULT_INACTIVITY;
```

### Verification:
- [ ] TIMEOUTS imported in StartCommand.ts
- [ ] All 3 magic numbers replaced
- [ ] logging.ts uses TIMEOUTS
- [ ] No compilation errors
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Task 3.3: Enforce Validation in ConfigManager

**File:** `src/features/orchestration/ConfigManager.ts`
**Order:** 🥉 THIRD (after 3.2)

### Step 1: Add import at top

```typescript
import { ConfigValidationError } from '../../shared/errors/index.js';
```

### Step 2: Update constructor (lines 48-53)

Replace the constructor with:

```typescript
constructor(config?: Partial<MaestroConfig>) {
  this.config = {
    ...ConfigManager.getDefaults(),
    ...config
  };

  // Validate configuration immediately
  const validation = this.validate();
  if (!validation.valid) {
    throw new ConfigValidationError(validation.errors);
  }
}
```

### Why:
The `validate()` method exists but is never called. This enforces validation on construction.

### Verification:
- [ ] ConfigValidationError imported
- [ ] Constructor calls validate()
- [ ] Throws error if validation fails
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Task 3.4: Add Dependency Injection to Maestro

**File:** `src/features/orchestration/Maestro.ts`
**Order:** 🏅 FOURTH (after 3.3)

### Step 1: Update constructor signature and implementation (lines 44-65)

Replace the entire constructor with:

```typescript
/**
 * Create a new Maestro orchestrator
 * @param config - Configuration manager or partial config object
 * @param ptyManager - PTY manager (optional, will create if not provided)
 * @param sessionManager - Session manager (optional, will create if not provided)
 * @param loggingManager - Logging manager (optional, will create if not provided)
 * @param agentRepository - Agent repository (optional, will create if not provided)
 */
constructor(
  config: ConfigManager | Partial<MaestroConfig>,
  ptyManager?: PTYManager,
  sessionManager?: SessionManager,
  loggingManager?: LoggingManager,
  agentRepository?: AgentRepository
) {
  // Handle config as ConfigManager or plain object
  this.config = config instanceof ConfigManager
    ? config
    : new ConfigManager(config);

  // Use injected dependencies or create new ones
  this.agentRepository = agentRepository ?? new AgentRepository();
  this.primaryAgent = this.agentRepository.findByName('claude');

  this.ptyManager = ptyManager ?? new PTYManager();
  this.sessionManager = sessionManager ?? new SessionManager();

  // Initialize logging manager
  this.loggingManager = loggingManager ?? new LoggingManager({
    enableFileLogging: this.config.get('enableFileLogging'),
    logLevel: this.config.get('logLevel'),
    logDirectory: this.config.get('logDirectory'),
    logRotation: this.config.get('logRotation'),
    maxLogFiles: this.config.get('maxLogFiles'),
    maxLogSizeBytes: this.config.get('maxLogSizeBytes')
  });

  this.streamProcessor = new StreamProcessor();
  this.outputFormatter = new OutputFormatter();
  this.statusUpdater = new StatusUpdater(undefined, this.loggingManager);
  this.sessionIdExtractor = new SessionIdExtractor();
}

/**
 * Static factory method for convenient creation
 * @param config - Partial configuration
 * @returns New Maestro instance with default dependencies
 */
static create(config?: Partial<MaestroConfig>): Maestro {
  return new Maestro(config ?? {});
}
```

### Step 2: Update StartCommand.ts (line 75)

**File:** `src/cli/commands/StartCommand.ts`

Replace:
```typescript
const maestro = new Maestro(config);
```

With:
```typescript
const maestro = Maestro.create(config);
```

### Why:
- Enables dependency injection for testing
- Maintains backward compatibility with factory method
- Follows SOLID principles

### Verification:
- [ ] Constructor accepts optional dependencies
- [ ] Static `create()` factory method added
- [ ] StartCommand uses `Maestro.create()`
- [ ] All dependencies use `??` (nullish coalescing)
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Post-Completion Checklist

After completing ALL 4 tasks IN ORDER:

- [ ] All 4 tasks marked as completed
- [ ] Run `npm run clean`
- [ ] Run `npm run build`
- [ ] Verify no TypeScript errors
- [ ] Quick smoke test:
  ```bash
  node dist/cli/index.js --help
  ```
- [ ] Update `docs/IMPLEMENTATION_TRACKER.md`:
  - Change Phase 3 status to ✅ Completed
  - Mark all 4 tasks as `[x]`
  - Update "Tasks Completed" to 4/4
- [ ] Commit changes with message: `refactor: Phase 3 - Architectural improvements (DI, SessionIdExtractor usage, config validation)`
- [ ] **DELETE THIS FILE** (`docs/tasks/phase-3-refactoring.md`)

---

## Troubleshooting

### If task 3.1 fails:
- Ensure Phase 2 is completed (SessionIdExtractor exists)
- Check import path: `./SessionIdExtractor.js` (relative)

### If task 3.2 fails:
- Ensure Phase 2 is completed (TIMEOUTS exists)
- Check that timeouts.ts exports TIMEOUTS

### If task 3.3 fails:
- Ensure Phase 2 is completed (ConfigValidationError exists)
- Check error import path

### If task 3.4 fails:
- Check all previous tasks completed
- Verify ConfigManager constructor works (3.3)
- Test factory method separately

### General debugging:
```bash
# See exact TypeScript errors
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/features/orchestration/Maestro.ts
```

---

**Created:** 2025-01-17
**Phase:** 3 of 6
**Next Phase:** Phase 4 & 5 (can run in parallel)
