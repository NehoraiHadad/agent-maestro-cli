# TASK-006: Merge Small Files

## 📌 Overview
**Priority**: 🟡 MEDIUM
**Status**: ⏳ Pending
**Estimated Time**: 2-3 hours
**Dependencies**: None
**Can Run in Parallel**: Yes (Group A)

---

## 🎯 Goal
Merge related small files to reduce fragmentation and improve code readability. The current structure has too many tiny files that make it hard to follow the logic.

---

## ❌ Problem

**Current structure** (`src/features/ui/session/`):
```
├── InputValidator.ts        (~50 lines)
├── KeypressHandler.ts       (~100 lines)
├── MessageProcessor.ts      (~80 lines)
├── PromptFormatter.ts       (~40 lines)
├── SessionCommands.ts       (~100 lines)
├── SessionDisplay.ts        (~60 lines)
└── index.ts                 (~10 lines)
```

**Total**: 7 files for ~440 lines

**Problem**: Too fragmented - hard to understand the flow without jumping between files.

---

## ✅ Solution

**Merge into 3 focused files**:
```
├── SessionInput.ts          (~190 lines) - InputValidator + PromptFormatter + KeypressHandler
├── SessionOutput.ts         (~140 lines) - SessionDisplay + MessageProcessor
├── SessionCommands.ts       (~100 lines) - Keep as is
└── index.ts                 (~10 lines)
```

**Total**: 4 files for ~440 lines (same code, better organization)

---

## 📂 Files to Merge

### Merge Group 1: SessionInput.ts
- `InputValidator.ts`
- `PromptFormatter.ts`
- `KeypressHandler.ts`

### Merge Group 2: SessionOutput.ts
- `SessionDisplay.ts`
- `MessageProcessor.ts`

### Keep Separate:
- `SessionCommands.ts` (has distinct responsibility)
- `index.ts` (exports)

---

## 🔧 Implementation Steps

### Step 1: Create SessionInput.ts

**File**: `src/features/ui/session/SessionInput.ts`

Merge `InputValidator.ts`, `PromptFormatter.ts`, and `KeypressHandler.ts`:

```typescript
/**
 * SessionInput - Handles all user input processing
 * Combines input validation, formatting, and keyboard handling
 */

import * as readline from 'readline';
import type { Maestro } from '../../orchestration/Maestro.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';

/**
 * Input Validator
 * Validates user input for empty strings and exit commands
 */
export class InputValidator {
  isExitCommand(input: string): boolean {
    const exitCommands = ['exit', 'quit', 'q'];
    return exitCommands.includes(input.toLowerCase());
  }

  isEmpty(input: string): boolean {
    return input.trim().length === 0;
  }
}

/**
 * Prompt Formatter
 * Formats the readline prompt based on Plan Mode state
 */
export class PromptFormatter {
  getPrompt(isPlanMode: boolean): string {
    if (isPlanMode) {
      return '\n📋 [Plan Mode] > ';
    }
    return '\n> ';
  }
}

/**
 * Keypress Handler
 * Manages keyboard shortcuts (Shift+Tab, Ctrl+C, Ctrl+D)
 */
export class KeypressHandler {
  private maestro: Maestro;
  private rl: readline.Interface;
  private logger: ConsoleLogger;
  private isSetup: boolean = false;

  constructor(maestro: Maestro, rl: readline.Interface, logger: ConsoleLogger) {
    this.maestro = maestro;
    this.rl = rl;
    this.logger = logger;
  }

  setup(callbacks: {
    onPlanModeToggle: () => void;
    onInterrupt: () => void;
    onEOF: () => void;
  }): void {
    if (this.isSetup) return;

    // Shift+Tab: Toggle Plan Mode
    process.stdin.on('keypress', (_char: string, key: any) => {
      if (key && key.name === 'tab' && key.shift) {
        const newState = this.maestro.togglePlanMode();
        this.logger.info(`\n📋 Plan Mode: ${newState ? 'enabled' : 'disabled'}`);
        callbacks.onPlanModeToggle();
      }
    });

    // Ctrl+C: Interrupt
    this.rl.on('SIGINT', callbacks.onInterrupt);

    // Ctrl+D: EOF
    this.rl.on('close', callbacks.onEOF);

    this.isSetup = true;
  }

  cleanup(): void {
    process.stdin.removeAllListeners('keypress');
  }
}
```

---

### Step 2: Create SessionOutput.ts

**File**: `src/features/ui/session/SessionOutput.ts`

Merge `SessionDisplay.ts` and `MessageProcessor.ts`:

```typescript
/**
 * SessionOutput - Handles all output display and message processing
 * Combines display formatting and message processing logic
 */

import type { Maestro } from '../../orchestration/Maestro.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';
import type { MaestroStats } from '../../orchestration/Maestro.js';

/**
 * Session Display
 * Handles display of welcome, summary, and session information
 */
export class SessionDisplay {
  private logger: ConsoleLogger;

  constructor(logger: ConsoleLogger) {
    this.logger = logger;
  }

  showWelcome(): void {
    this.logger.separator();
    this.logger.maestro('AgentMaestro - Wrapper for Claude Code');
    this.logger.separator();
    this.logger.info('🤖 Running: Claude Code (native interface)');
    this.logger.info('💡 Tip: Claude can delegate to Codex/Gemini via Subagents');
    this.logger.info('');
    this.logger.info('💬 Type your messages below');
    this.logger.info('⌨️  Press Shift+Tab to toggle Plan Mode');
    this.logger.info('📋 Commands: /reset, /session-info, /help-session');
    this.logger.info('🚪 Type "exit" or "quit" to end session\n');
    this.logger.separator();
  }

  showSummary(stats: MaestroStats): void {
    console.log('\n');
    this.logger.separator();
    this.logger.maestro('Session ended');
    this.logger.info(`Total messages: ${stats.totalMessages}`);
    this.logger.info(`Duration: ${this.formatDuration(stats.sessionDuration)}`);
    this.logger.separator();
    this.logger.success('\nGoodbye! 👋\n');
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

/**
 * Message Processor
 * Processes user messages and sends them to maestro
 */
export class MessageProcessor {
  private maestro: Maestro;
  private logger: ConsoleLogger;

  constructor(maestro: Maestro, logger: ConsoleLogger) {
    this.maestro = maestro;
    this.logger = logger;
  }

  async process(
    message: string,
    onPause: () => void,
    onResume: () => void
  ): Promise<void> {
    onPause();

    try {
      await this.maestro.sendMessage(message);
    } catch (error) {
      this.logger.error(`\nError: ${error instanceof Error ? error.message : String(error)}\n`);
    } finally {
      onResume();
    }
  }
}
```

---

### Step 3: Update InteractiveSession.ts

**File**: `src/features/ui/InteractiveSession.ts`

Update imports:
```typescript
// Before:
import {
  KeypressHandler,
  PromptFormatter,
  MessageProcessor,
  SessionDisplay,
  InputValidator,
  SessionCommands
} from './session/index.js';

// After:
import {
  InputValidator,
  PromptFormatter,
  KeypressHandler
} from './session/SessionInput.js';
import {
  SessionDisplay,
  MessageProcessor
} from './session/SessionOutput.js';
import { SessionCommands } from './session/SessionCommands.js';
```

---

### Step 4: Update index.ts

**File**: `src/features/ui/session/index.ts`

```typescript
// Before:
export * from './InputValidator.js';
export * from './KeypressHandler.js';
export * from './MessageProcessor.js';
export * from './PromptFormatter.js';
export * from './SessionCommands.js';
export * from './SessionDisplay.js';

// After:
export * from './SessionInput.js';
export * from './SessionOutput.js';
export * from './SessionCommands.js';
```

---

### Step 5: Delete Old Files

```bash
rm src/features/ui/session/InputValidator.ts
rm src/features/ui/session/KeypressHandler.ts
rm src/features/ui/session/MessageProcessor.ts
rm src/features/ui/session/PromptFormatter.ts
rm src/features/ui/session/SessionDisplay.ts
```

**Keep**:
- `SessionCommands.ts`
- `index.ts`

---

### Step 6: Test Everything

```bash
# Build
npm run build

# Run tests
npm run test

# Manual test
node dist/cli/index.js
```

---

## ✅ Acceptance Criteria

- [ ] SessionInput.ts contains InputValidator, PromptFormatter, KeypressHandler
- [ ] SessionOutput.ts contains SessionDisplay, MessageProcessor
- [ ] SessionCommands.ts remains separate
- [ ] index.ts exports updated
- [ ] InteractiveSession.ts imports updated
- [ ] Old files deleted
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Interactive session works correctly

---

## 🔍 Verification

```bash
# Check file count
ls src/features/ui/session/
# Expected: 4 files (SessionInput.ts, SessionOutput.ts, SessionCommands.ts, index.ts)

# Check imports
grep -r "from './session/" src/features/ui/

# Build and test
npm run build
npm run test

# Manual test
node dist/cli/index.js
# Type some messages, test /reset, test exit
```

---

## 🚨 Rollback Plan

If issues occur:
```bash
git checkout HEAD -- src/features/ui/session/
git checkout HEAD -- src/features/ui/InteractiveSession.ts
npm run build
```

---

## 📝 Post-Completion

After completing this task:
1. Update `docs/tasks/STATUS.md`:
   - Change TASK-006 status to ✅ Complete
   - Add completion date to Change Log
   - Note: 7 files → 4 files
2. Delete this file: `docs/tasks/TASK-006-merge-small-files.md`
3. Commit changes:
```bash
git add .
git commit -m "refactor: merge small session files (TASK-006)"
```

---

## 💡 Notes

- Can run in parallel with all tasks except those that modify InteractiveSession.ts
- Improves code readability without changing functionality
- Reduces mental overhead when reading code
- Keep logical groupings: Input / Output / Commands
