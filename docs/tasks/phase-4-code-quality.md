# Phase 4: Code Quality Improvements 📝

**Execution Mode:** ✅ **PARALLEL** - All tasks can run simultaneously
**Estimated Time:** ~10 minutes
**Dependencies:** Phase 3 must be completed first

---

## ⚠️ Important Instructions

1. **Run all 5 tasks in PARALLEL** - they are independent
2. After completion, run `npm run build` to verify
3. Update `docs/IMPLEMENTATION_TRACKER.md` when done
4. **DELETE THIS FILE** after all tasks are completed and verified

---

## Task 4.1: Replace console.log with LoggingManager

**File:** `src/features/orchestration/Maestro.ts`
**Lines to change:** 202-207, 220-222

### Step 1: Delete lines 202-207

Remove this verbose console.log block:
```typescript
if (this.config.get('verbose')) {
  console.log(`[DEBUG] Interactive mode: ${isInteractive}`);
  console.log(`[DEBUG] CLI session active: ${cliSession?.isActive ?? false}`);
  console.log(`[DEBUG] Should continue session: ${shouldContinueSession}`);
  console.log(`[DEBUG] Session ID: ${sessionId || 'none'}`);
  console.log(`[DEBUG] Using --resume with ID: ${useSessionId}`);
}
```

### Step 2: Replace with LoggingManager calls

Add in the same location:
```typescript
// Debug logging
this.loggingManager.debug('Maestro', `Interactive mode: ${isInteractive}`);
this.loggingManager.debug('Maestro', `CLI session active: ${cliSession?.isActive ?? false}`);
this.loggingManager.debug('Maestro', `Should continue session: ${shouldContinueSession}`);
this.loggingManager.debug('Maestro', `Session ID: ${sessionId || 'none'}`);
this.loggingManager.debug('Maestro', `Using --resume with ID: ${useSessionId}`);
```

### Step 3: Replace lines 220-222

Remove:
```typescript
if (this.config.get('verbose')) {
  console.log(`[DEBUG] Command args: ${this.primaryAgent.command} ${args.join(' ')}`);
}
```

Replace with:
```typescript
// Debug logging
this.loggingManager.debug('Maestro', `Command args: ${this.primaryAgent.command} ${args.join(' ')}`);
```

### Why:
LoggingManager handles log levels properly and can write to files. console.log bypasses this.

### Verification:
- [ ] No more `console.log` in Maestro.ts
- [ ] All debug messages use `this.loggingManager.debug()`
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Task 4.2: Improve TypeScript Types

**File:** `src/shared/types/agent.types.ts`

### Step 1: Replace the entire file content

```typescript
/**
 * Core types for Agent entities
 */

export type AgentName = 'claude' | 'gemini' | 'codex';

export interface AgentFlags {
  prompt: string;
  json?: string[];
  stream?: string[];
  mode?: {
    suggest?: string;
    autoEdit?: string;
    fullAuto?: string;
  };
}

export interface Agent {
  readonly name: AgentName;
  readonly displayName: string;
  readonly command: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly flags: Readonly<AgentFlags>;
  readonly requiresAuth: boolean;
  readonly authType: string;
  readonly packageName: string;
  readonly color: string;
}

export interface AgentConfig {
  inactivityTimeout?: number;
  maxDelegationDepth?: number;
  showSpinner?: boolean;
  verbose?: boolean;
  planMode?: boolean;
}

/**
 * Options for agent execution
 */
export interface AgentExecutionOptions {
  /** Enable streaming output */
  stream?: boolean;

  /** Continue previous session (ONLY in interactive mode) */
  continueSession?: boolean;

  /** Specific session ID to resume */
  sessionId?: string;

  /** Enable plan mode (research without execution) */
  planMode?: boolean;

  /** Enable dangerous mode for Codex (bypass approvals) */
  dangerousMode?: boolean;
}

export interface AgentExecutionResult {
  agent: string;
  content: string;
  delegations: DelegationResult[];
  exitCode: number;
}

export interface DelegationResult {
  fromAgent: string;
  toAgent: string;
  prompt: string;
  result: string;
}
```

### Step 2: Update Agent.ts to use AgentExecutionOptions

**File:** `src/domain/entities/Agent.ts`

Replace the method signature (lines 88-96):

```typescript
getExecutionArgs(
  prompt: string,
  options?: AgentExecutionOptions
): string[] {
  const args: string[] = [];

  // Codex dangerous mode (configurable via options)
  if (this.name === 'codex' && options?.dangerousMode !== false) {
    args.push('--dangerously-bypass-approvals-and-sandbox');
  }

  const finalPrompt = prompt;
  // ... rest of method unchanged
}
```

### Why:
- Adds `readonly` modifiers for immutability
- Creates explicit `AgentExecutionOptions` interface
- Makes `dangerousMode` configurable instead of hardcoded

### Verification:
- [ ] `capabilities` is `readonly string[]`
- [ ] `flags` is `Readonly<AgentFlags>`
- [ ] `AgentExecutionOptions` interface exists
- [ ] Agent.ts uses `AgentExecutionOptions`
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Task 4.3: Add Comprehensive JSDoc

**File:** `src/features/orchestration/Maestro.ts`

### Add JSDoc to these public methods:

#### For `start()` method (before line 70):

```typescript
/**
 * Start the orchestrator and initialize all subsystems
 *
 * @throws {Error} If orchestrator is already running
 *
 * @example
 * ```typescript
 * const maestro = Maestro.create({ verbose: true });
 * await maestro.start();
 * ```
 */
async start(): Promise<void> {
```

#### For `sendMessage()` method (before line 98):

```typescript
/**
 * Send a message to the primary agent and execute it
 *
 * @param message - User's message to send to the agent
 * @returns Promise resolving to agent execution result with content and metadata
 *
 * @throws {Error} If Maestro is not running (call start() first)
 * @throws {PTYSpawnError} If process spawn fails
 * @throws {AgentExecutionError} If agent execution fails
 *
 * @example
 * ```typescript
 * const result = await maestro.sendMessage("Explain this codebase");
 * console.log(result.content);
 * console.log(`Exit code: ${result.exitCode}`);
 * ```
 */
async sendMessage(message: string): Promise<AgentExecutionResult> {
```

#### For `stop()` method (before line 116):

```typescript
/**
 * Stop the orchestrator and cleanup all resources
 * Performs graceful shutdown of PTY processes and closes logging
 *
 * @example
 * ```typescript
 * await maestro.stop();
 * ```
 */
async stop(): Promise<void> {
```

#### For `togglePlanMode()` method (before line 421):

```typescript
/**
 * Toggle Plan Mode on/off
 * Plan Mode enables research and planning without code execution
 *
 * @returns New Plan Mode state (true if enabled, false if disabled)
 *
 * @example
 * ```typescript
 * const isEnabled = maestro.togglePlanMode();
 * console.log(`Plan Mode is now ${isEnabled ? 'enabled' : 'disabled'}`);
 * ```
 */
togglePlanMode(): boolean {
```

#### For `resetSession()` method (before line 443):

```typescript
/**
 * Reset the current session
 * Clears the CLI session to start a fresh conversation
 *
 * @example
 * ```typescript
 * maestro.resetSession();
 * console.log('Session reset - starting fresh conversation');
 * ```
 */
resetSession(): void {
```

### Why:
Provides clear API documentation for developers using Maestro.

### Verification:
- [ ] All 5 public methods have JSDoc
- [ ] JSDoc includes @param, @returns, @throws where applicable
- [ ] JSDoc includes @example for each method
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Task 4.4: Convert Tests to TypeScript

**Directory:** `tests/`

### Step 1: Create tsconfig.test.json

**File:** `tsconfig.test.json` (in project root)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/tests",
    "rootDir": ".",
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["tests/**/*.ts", "src/**/*.ts"]
}
```

### Step 2: Rename test files from .js to .ts

Run these commands:
```bash
cd tests
mv test-basic.js test-basic.ts
mv test-claude-message.js test-claude-message.ts
mv test-single-message.js test-single-message.ts
mv test-pty-integration.js test-pty-integration.ts
# ... rename all other test files
```

Or use a loop:
```bash
cd tests
for file in *.js; do
  mv "$file" "${file%.js}.ts"
done
```

### Step 3: Add types to test-basic.ts (example)

Update the file to use proper types:

```typescript
import { Maestro } from '../src/features/orchestration/Maestro.js';
import type { AgentExecutionResult } from '../src/shared/types/index.js';

async function testBasic(): Promise<void> {
  console.log('Testing basic Maestro functionality...');

  const maestro = Maestro.create({
    verbose: true,
    showSpinner: false
  });

  await maestro.start();

  const result: AgentExecutionResult = await maestro.sendMessage('Hello, what is 2+2?');

  console.log('Result:', result.content.substring(0, 100));

  await maestro.stop();
  console.log('✓ Basic test passed');
}

testBasic().catch(console.error);
```

### Step 4: Update package.json test script

**File:** `package.json` (line 17)

```json
"test": "tsc --project tsconfig.test.json && node dist/tests/test-basic.js"
```

### Why:
TypeScript tests benefit from type checking and better IDE support.

### Verification:
- [ ] tsconfig.test.json created
- [ ] All .js test files renamed to .ts
- [ ] At least test-basic.ts has proper types
- [ ] package.json test script updated
- [ ] Tests compile: `tsc --project tsconfig.test.json`

**Status:** [ ] Completed

---

## Task 4.5: Improve Error Messages

**File:** `src/shared/errors/PTYErrors.ts`

### Replace the entire file:

```typescript
/**
 * PTY-related errors
 */
import { BaseError } from './BaseError.js';

export class PTYSpawnError extends BaseError {
  constructor(command: string, reason: string) {
    super(
      `Failed to spawn PTY process for command '${command}': ${reason}\n` +
      `Troubleshooting:\n` +
      `  1. Verify the command is installed: which ${command}\n` +
      `  2. Check PATH environment variable\n` +
      `  3. Try running the command directly: ${command} --version`,
      'PTY_SPAWN_ERROR',
      { command, reason }
    );
  }
}

export class PTYWriteError extends BaseError {
  constructor(processId: string, reason: string) {
    super(
      `Failed to write to PTY process '${processId}': ${reason}\n` +
      `Possible causes:\n` +
      `  1. Process has already exited\n` +
      `  2. Process stdin is closed\n` +
      `  3. Process is not accepting input`,
      'PTY_WRITE_ERROR',
      { processId, reason }
    );
  }
}
```

### Why:
Error messages now include troubleshooting steps to help users fix issues.

### Verification:
- [ ] PTYSpawnError includes troubleshooting steps
- [ ] PTYWriteError includes possible causes
- [ ] File compiles: `npx tsc --noEmit`

**Status:** [ ] Completed

---

## Post-Completion Checklist

After completing all 5 tasks:

- [ ] All 5 tasks marked as completed
- [ ] Run `npm run clean`
- [ ] Run `npm run build`
- [ ] Verify no TypeScript errors
- [ ] Run tests: `npm test`
- [ ] Update `docs/IMPLEMENTATION_TRACKER.md`:
  - Change Phase 4 status to ✅ Completed
  - Mark all 5 tasks as `[x]`
  - Update "Tasks Completed" to 5/5
- [ ] Commit changes with message: `refactor: Phase 4 - Code quality improvements (TypeScript types, JSDoc, tests, error messages)`
- [ ] **DELETE THIS FILE** (`docs/tasks/phase-4-code-quality.md`)

---

## Troubleshooting

### If test conversion fails:
- Ensure you're in the tests directory when renaming
- Check that import paths use `.js` extension
- Verify TypeScript can find type definitions

### If JSDoc breaks formatting:
- Use proper markdown in @example blocks
- Ensure code blocks are properly closed with ```

---

**Created:** 2025-01-17
**Phase:** 4 of 6
**Can run in parallel with:** Phase 5
