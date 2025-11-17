# Task 05: Type Safety Improvements

> **Priority:** MEDIUM
> **Estimated Time:** 4-6 hours
> **Files to Modify:**
> - `src/features/ui/session/KeypressHandler.ts`
> - `src/features/ui/spinner/Spinner.ts`
> - `src/features/ui/menu/InteractiveMenu.ts`
> - `src/features/ui/logger/ConsoleLogger.ts`
> - `src/shared/types/ui.types.ts` (new)
> - `package.json` (add @types packages)

---

## 🎯 Objective

Remove all `any` types and unsafe type assertions, replacing them with proper TypeScript type definitions to improve type safety and catch potential bugs at compile time.

---

## 📋 Current Problems

Multiple uses of `any` type throughout the UI components:

```typescript
// KeypressHandler.ts:54
process.stdin.on('keypress', (_str: string, key: any) => {

// Spinner.ts:13
private spinner: any; // ora instance

// InteractiveMenu.ts:98
const answer: any = await (inquirer.prompt as any)([

// ConsoleLogger.ts:98-99
const coloredLabel = color && (chalk as any)[color]
  ? (chalk as any)[color].bold(agentLabel)
```

**Risks:**
- Type errors not caught at compile time
- No IDE autocomplete/IntelliSense
- Harder to refactor safely
- Potential runtime errors

---

## ✅ Implementation Requirements

### 1. Install Missing Type Packages

**File:** `package.json`

```bash
npm install --save-dev @types/inquirer@latest
```

Verify these are in devDependencies:
```json
{
  "devDependencies": {
    "@types/inquirer": "^9.0.0",
    "@types/node": "^20.19.25",
    "typescript": "^5.3.0"
  }
}
```

### 2. Create UI Types

**File:** `src/shared/types/ui.types.ts`

```typescript
/**
 * UI-related type definitions
 */

import type { Ora } from 'ora';
import type { Answers, DistinctQuestion } from 'inquirer';

/**
 * Keypress event from readline
 */
export interface KeypressEvent {
  name?: string;
  sequence?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

/**
 * Spinner instance (Ora)
 */
export type SpinnerInstance = Ora;

/**
 * Inquirer prompt question
 */
export type PromptQuestion<T extends Answers = Answers> = DistinctQuestion<T>;

/**
 * Chalk color methods available for styling
 */
export type ChalkColorMethod =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray'
  | 'grey';

/**
 * Agent label configuration for console output
 */
export interface AgentLabelConfig {
  label: string;
  color?: ChalkColorMethod;
  bold?: boolean;
}

/**
 * Menu choice for interactive selection
 */
export interface MenuChoice {
  name: string;
  value: string;
  description?: string;
}

/**
 * Menu selection result
 */
export interface MenuSelection {
  agent: string;
}
```

### 3. Fix KeypressHandler

**File:** `src/features/ui/session/KeypressHandler.ts`

```typescript
import type { KeypressEvent } from '../../../../shared/types/ui.types.js';

export class KeypressHandler {
  // ... existing code ...

  setupKeypress(
    onInput: (data: string) => void,
    onExit: () => void,
    onCtrlC: () => void
  ): void {
    const readline = require('readline');
    readline.emitKeypressEvents(process.stdin);

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    // Fix type annotation
    process.stdin.on('keypress', (_str: string, key: KeypressEvent) => {
      if (!key) return;

      // Handle Ctrl+C
      if (key.ctrl && key.name === 'c') {
        onCtrlC();
        return;
      }

      // Handle Ctrl+D (EOF)
      if (key.ctrl && key.name === 'd') {
        onExit();
        return;
      }

      // Handle Enter
      if (key.name === 'return' || key.name === 'enter') {
        onInput('\n');
        return;
      }

      // Handle regular characters
      if (key.sequence && !key.ctrl && !key.meta) {
        onInput(key.sequence);
      }
    });
  }

  cleanup(): void {
    process.stdin.removeAllListeners('keypress');
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  }
}
```

### 4. Fix Spinner

**File:** `src/features/ui/spinner/Spinner.ts`

```typescript
import ora from 'ora';
import type { SpinnerInstance } from '../../../../shared/types/ui.types.js';

export class Spinner {
  private spinner: SpinnerInstance | null = null;
  private isEnabled: boolean;

  constructor(isEnabled: boolean = true) {
    this.isEnabled = isEnabled;
  }

  start(text: string): void {
    if (!this.isEnabled) return;

    this.spinner = ora({
      text,
      color: 'cyan',
      spinner: 'dots'
    }).start();
  }

  update(text: string): void {
    if (!this.isEnabled || !this.spinner) return;
    this.spinner.text = text;
  }

  succeed(text?: string): void {
    if (!this.isEnabled || !this.spinner) return;
    this.spinner.succeed(text);
    this.spinner = null;
  }

  fail(text?: string): void {
    if (!this.isEnabled || !this.spinner) return;
    this.spinner.fail(text);
    this.spinner = null;
  }

  stop(): void {
    if (!this.isEnabled || !this.spinner) return;
    this.spinner.stop();
    this.spinner = null;
  }

  isSpinning(): boolean {
    return this.spinner !== null && this.spinner.isSpinning;
  }
}
```

### 5. Fix InteractiveMenu

**File:** `src/features/ui/menu/InteractiveMenu.ts`

```typescript
import inquirer from 'inquirer';
import type { MenuChoice, MenuSelection } from '../../../../shared/types/ui.types.js';

export class InteractiveMenu {
  // ... existing code ...

  async selectAgent(choices: MenuChoice[]): Promise<string> {
    const questions: inquirer.DistinctQuestion<MenuSelection>[] = [
      {
        type: 'list',
        name: 'agent',
        message: 'Select an agent:',
        choices: choices.map(choice => ({
          name: choice.name,
          value: choice.value,
          ...(choice.description && { description: choice.description })
        })),
        pageSize: 10
      }
    ];

    const answer = await inquirer.prompt<MenuSelection>(questions);
    return answer.agent;
  }

  async confirm(message: string, defaultValue: boolean = false): Promise<boolean> {
    interface ConfirmAnswer {
      confirmed: boolean;
    }

    const questions: inquirer.DistinctQuestion<ConfirmAnswer>[] = [
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue
      }
    ];

    const answer = await inquirer.prompt<ConfirmAnswer>(questions);
    return answer.confirmed;
  }

  async input(message: string, defaultValue?: string): Promise<string> {
    interface InputAnswer {
      value: string;
    }

    const questions: inquirer.DistinctQuestion<InputAnswer>[] = [
      {
        type: 'input',
        name: 'value',
        message,
        ...(defaultValue && { default: defaultValue })
      }
    ];

    const answer = await inquirer.prompt<InputAnswer>(questions);
    return answer.value;
  }
}
```

### 6. Fix ConsoleLogger

**File:** `src/features/ui/logger/ConsoleLogger.ts`

```typescript
import chalk from 'chalk';
import type { ChalkColorMethod, AgentLabelConfig } from '../../../../shared/types/ui.types.js';

export class ConsoleLogger {
  // ... existing code ...

  /**
   * Get chalk color function safely
   * @param color - Color name
   * @returns Chalk function or null if invalid
   */
  private getChalkColor(color: string): ((text: string) => string) | null {
    const validColors: ChalkColorMethod[] = [
      'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey'
    ];

    if (validColors.includes(color as ChalkColorMethod)) {
      return chalk[color as ChalkColorMethod];
    }

    return null;
  }

  /**
   * Format agent label with color
   * @param config - Label configuration
   * @returns Formatted label
   */
  private formatAgentLabel(config: AgentLabelConfig): string {
    let formattedLabel = config.label;

    // Apply color if specified
    if (config.color) {
      const colorFn = this.getChalkColor(config.color);
      if (colorFn) {
        formattedLabel = colorFn(formattedLabel);
      }
    }

    // Apply bold if specified
    if (config.bold) {
      formattedLabel = chalk.bold(formattedLabel);
    }

    return formattedLabel;
  }

  agent(agentName: string, message: string, color?: ChalkColorMethod): void {
    const agentLabel = `[${agentName}]`;

    let coloredLabel = agentLabel;
    if (color) {
      const colorFn = this.getChalkColor(color);
      if (colorFn) {
        coloredLabel = chalk.bold(colorFn(agentLabel));
      }
    }

    console.log(`${coloredLabel} ${message}`);
  }

  // Update other methods similarly...
}
```

### 7. Update Type Exports

**File:** `src/shared/types/index.ts`

```typescript
export * from './agent.types.js';
export * from './streaming.types.js';
export * from './pty.types.js';
export * from './delegation.types.js';
export * from './validation.types.js';
export * from './ui.types.js'; // Add this
```

---

## 🧪 Testing Instructions

1. **Type checking:**
   ```bash
   npm run build
   # Should compile with no errors
   ```

2. **Check for remaining `any` types:**
   ```bash
   grep -r "any" src/ --include="*.ts" | grep -v "node_modules" | grep -v "// any is OK"
   ```

3. **Test UI components:**
   ```bash
   # Test interactive menu
   maestro

   # Test keypress handling
   # (Type characters, Ctrl+C, etc.)

   # Test spinner
   maestro -m "test message"
   ```

4. **IDE verification:**
   - Open files in VS Code
   - Verify autocomplete works for ora, inquirer, chalk
   - Verify no type errors shown

---

## ✅ Acceptance Criteria

- [ ] All `any` types removed from UI components
- [ ] Proper type definitions for ora, inquirer, chalk
- [ ] UI types defined in ui.types.ts
- [ ] Type-safe color handling in ConsoleLogger
- [ ] Type-safe keypress handling
- [ ] Type-safe inquirer prompts
- [ ] TypeScript compilation successful with no errors
- [ ] No type warnings in IDE
- [ ] All UI components work correctly after changes

---

## 📊 Before/After Comparison

### Before:
```typescript
private spinner: any;
const answer: any = await (inquirer.prompt as any)([...]);
const coloredLabel = (chalk as any)[color];
```

### After:
```typescript
private spinner: SpinnerInstance | null;
const answer = await inquirer.prompt<MenuSelection>(questions);
const colorFn = this.getChalkColor(color);
```

---

## 📝 Completion Steps

1. Install missing @types packages
2. Create ui.types.ts with all type definitions
3. Update KeypressHandler with proper types
4. Update Spinner with proper types
5. Update InteractiveMenu with proper types
6. Update ConsoleLogger with proper types
7. Run TypeScript compilation - verify no errors
8. Test all UI components manually
9. Commit changes: `git commit -m "refactor: Remove 'any' types and improve type safety (Task 05)"`
10. Delete this task file: `rm docs/tasks/task-05-type-safety.md`
11. Update `docs/TASKS_MASTER.md` with completion status

---

## 🔗 Related Tasks

- Task 08: Comprehensive Test Suite (verify types work correctly)

---

**Let's make TypeScript work for us, not against us! 💪**
