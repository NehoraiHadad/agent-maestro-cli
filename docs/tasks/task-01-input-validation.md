# Task 01: Input Validation for User Messages

> **Priority:** CRITICAL
> **Estimated Time:** 2-3 hours
> **Files to Modify:**
> - `src/features/orchestration/Maestro.ts`
> - `src/shared/types/validation.types.ts` (new)
> - `src/shared/utils/InputValidator.ts` (new)
> - `tests/unit/InputValidator.test.ts` (new)

---

## 🎯 Objective

Add comprehensive input validation for user messages to prevent security vulnerabilities including command injection, XSS, and malicious input patterns.

---

## 📋 Current Problem

User messages are passed directly to PTY processes without any validation or sanitization:

```typescript
// src/features/orchestration/Maestro.ts:303-308
const args = this.primaryAgent.getExecutionArgs(message, {
  stream: true,
  continueSession: shouldContinueSession,
  sessionId: useSessionId ? sessionId : undefined,
  planMode: this.config.get('planMode')
});
```

**Risk:** Malicious users could inject shell commands, overflow buffers, or exploit the AI agents.

---

## ✅ Implementation Requirements

### 1. Create Validation Types

**File:** `src/shared/types/validation.types.ts`

```typescript
/**
 * Input validation types
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedValue?: string;
}

export interface ValidationRule {
  name: string;
  validate: (input: string) => boolean;
  errorMessage: string;
}

export interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowedPatterns?: RegExp[];
  forbiddenPatterns?: RegExp[];
  sanitize?: boolean;
}
```

### 2. Create InputValidator Utility

**File:** `src/shared/utils/InputValidator.ts`

```typescript
import { ValidationResult, ValidationOptions } from '../types/validation.types.js';

/**
 * Input validator for user messages and commands
 */
export class InputValidator {
  private static readonly DEFAULT_MAX_LENGTH = 100000;
  private static readonly DEFAULT_MIN_LENGTH = 1;

  // Dangerous patterns that should trigger warnings
  private static readonly DANGEROUS_PATTERNS = [
    { pattern: /\$\(.*?\)/g, name: 'Command substitution' },
    { pattern: /`.*?`/g, name: 'Backtick execution' },
    { pattern: /;\s*rm\s+-rf/gi, name: 'Destructive command' },
    { pattern: />\s*\/dev\/null/g, name: 'Output redirection' },
    { pattern: /&&|\|\|/g, name: 'Command chaining' },
    { pattern: /<script.*?>/gi, name: 'Script tag' },
    { pattern: /eval\s*\(/gi, name: 'Eval function' },
  ];

  /**
   * Validate user message input
   * @param message - User message to validate
   * @param options - Validation options
   * @returns Validation result
   */
  static validateMessage(
    message: unknown,
    options: ValidationOptions = {}
  ): ValidationResult {
    const maxLength = options.maxLength ?? this.DEFAULT_MAX_LENGTH;
    const minLength = options.minLength ?? this.DEFAULT_MIN_LENGTH;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Type check
    if (typeof message !== 'string') {
      errors.push('Message must be a string');
      return { isValid: false, errors, warnings };
    }

    // Empty check
    if (!message || message.trim().length === 0) {
      errors.push('Message cannot be empty');
      return { isValid: false, errors, warnings };
    }

    // Length validation
    if (message.length > maxLength) {
      errors.push(`Message exceeds maximum length of ${maxLength} characters`);
    }

    if (message.length < minLength) {
      errors.push(`Message must be at least ${minLength} characters`);
    }

    // Check for dangerous patterns
    for (const { pattern, name } of this.DANGEROUS_PATTERNS) {
      if (pattern.test(message)) {
        warnings.push(`Message contains potentially dangerous pattern: ${name}`);
      }
    }

    // Check for null bytes (can cause issues in C-based code)
    if (message.includes('\0')) {
      errors.push('Message contains null bytes');
    }

    // Check for excessive newlines (potential DoS)
    const newlineCount = (message.match(/\n/g) || []).length;
    if (newlineCount > 1000) {
      warnings.push('Message contains excessive newlines (potential DoS)');
    }

    // Sanitize if requested
    let sanitizedValue: string | undefined;
    if (options.sanitize) {
      sanitizedValue = this.sanitizeMessage(message);
    }

    const isValid = errors.length === 0;
    return { isValid, errors, warnings, sanitizedValue };
  }

  /**
   * Sanitize message by removing dangerous characters
   * @param message - Message to sanitize
   * @returns Sanitized message
   */
  private static sanitizeMessage(message: string): string {
    return message
      .replace(/\0/g, '') // Remove null bytes
      .trim();
  }

  /**
   * Validate command name (for PTY spawning)
   * @param command - Command name to validate
   * @returns Validation result
   */
  static validateCommandName(command: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof command !== 'string') {
      errors.push('Command must be a string');
      return { isValid: false, errors, warnings };
    }

    // Only allow alphanumeric, dash, underscore, and dot
    if (!/^[a-zA-Z0-9_.-]+$/.test(command)) {
      errors.push('Command name contains invalid characters');
    }

    // Prevent path traversal
    if (command.includes('..') || command.includes('/') || command.includes('\\')) {
      errors.push('Command name cannot contain path separators');
    }

    const isValid = errors.length === 0;
    return { isValid, errors, warnings };
  }

  /**
   * Validate file path
   * @param path - File path to validate
   * @returns Validation result
   */
  static validatePath(path: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof path !== 'string') {
      errors.push('Path must be a string');
      return { isValid: false, errors, warnings };
    }

    // Check for path traversal
    if (path.includes('..')) {
      errors.push('Path cannot contain traversal sequences (..)');
    }

    // Check for null bytes
    if (path.includes('\0')) {
      errors.push('Path contains null bytes');
    }

    const isValid = errors.length === 0;
    return { isValid, errors, warnings };
  }
}
```

### 3. Integrate Validation in Maestro

**File:** `src/features/orchestration/Maestro.ts`

Add validation in the `sendMessage` method:

```typescript
import { InputValidator } from '../../shared/utils/InputValidator.js';

async sendMessage(message: string): Promise<AgentExecutionResult> {
  // Validate input message
  const validationResult = InputValidator.validateMessage(message, {
    maxLength: 100000,
    minLength: 1,
  });

  if (!validationResult.isValid) {
    const errorMessage = `Invalid input: ${validationResult.errors.join(', ')}`;
    this.loggingManager.error('Maestro', errorMessage);
    throw new Error(errorMessage);
  }

  // Log warnings if any
  if (validationResult.warnings.length > 0) {
    for (const warning of validationResult.warnings) {
      this.loggingManager.warn('Maestro', `Input validation warning: ${warning}`);
    }
  }

  // Continue with existing logic...
  // ...rest of the method
}
```

### 4. Create Unit Tests

**File:** `tests/unit/InputValidator.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { InputValidator } from '../../src/shared/utils/InputValidator.js';

describe('InputValidator', () => {
  describe('validateMessage', () => {
    it('should accept valid messages', () => {
      const result = InputValidator.validateMessage('Hello, Claude!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-string input', () => {
      const result = InputValidator.validateMessage(123);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message must be a string');
    });

    it('should reject empty messages', () => {
      const result = InputValidator.validateMessage('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message cannot be empty');
    });

    it('should reject messages exceeding max length', () => {
      const longMessage = 'a'.repeat(100001);
      const result = InputValidator.validateMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum length');
    });

    it('should warn about command substitution patterns', () => {
      const result = InputValidator.validateMessage('Execute $(rm -rf /)');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Command substitution');
    });

    it('should warn about backtick execution', () => {
      const result = InputValidator.validateMessage('Run `malicious command`');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should reject null bytes', () => {
      const result = InputValidator.validateMessage('Hello\0World');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message contains null bytes');
    });

    it('should warn about excessive newlines', () => {
      const message = '\n'.repeat(1001);
      const result = InputValidator.validateMessage(message);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateCommandName', () => {
    it('should accept valid command names', () => {
      const result = InputValidator.validateCommandName('claude');
      expect(result.isValid).toBe(true);
    });

    it('should reject commands with path separators', () => {
      const result = InputValidator.validateCommandName('../bin/bash');
      expect(result.isValid).toBe(false);
    });

    it('should reject commands with special characters', () => {
      const result = InputValidator.validateCommandName('rm -rf');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePath', () => {
    it('should accept valid paths', () => {
      const result = InputValidator.validatePath('/home/user/project');
      expect(result.isValid).toBe(true);
    });

    it('should reject path traversal', () => {
      const result = InputValidator.validatePath('/home/../etc/passwd');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path cannot contain traversal sequences (..)');
    });
  });
});
```

---

## 🧪 Testing Instructions

1. **Run unit tests:**
   ```bash
   npm run test -- InputValidator.test.ts
   ```

2. **Test with TypeScript compilation:**
   ```bash
   npm run build
   ```

3. **Manual testing:**
   ```bash
   # Test valid input
   maestro -m "Hello, Claude!"

   # Test with dangerous patterns (should show warnings)
   maestro -m "Execute $(echo test)"

   # Test with very long message
   maestro -m "$(python3 -c 'print("a" * 100001)')"
   ```

---

## ✅ Acceptance Criteria

- [ ] InputValidator class created with all validation methods
- [ ] Validation types defined in validation.types.ts
- [ ] Integration in Maestro.sendMessage() complete
- [ ] All unit tests passing (100% coverage for InputValidator)
- [ ] TypeScript compilation successful with no errors
- [ ] Warnings logged for dangerous patterns
- [ ] Errors thrown for invalid input
- [ ] Manual testing confirms validation works

---

## 📝 Completion Steps

1. Implement all code changes
2. Run all tests and verify they pass
3. Test manually with various inputs
4. Update imports in `src/shared/utils/index.ts`:
   ```typescript
   export * from './InputValidator.js';
   ```
5. Update imports in `src/shared/types/index.ts`:
   ```typescript
   export * from './validation.types.js';
   ```
6. Commit changes: `git commit -m "feat: Add input validation for user messages (Task 01)"`
7. Delete this task file: `rm docs/tasks/task-01-input-validation.md`
8. Update `docs/TASKS_MASTER.md` with completion status

---

## 🔗 Related Tasks

- Task 03: Environment Variable Filtering
- Task 08: Comprehensive Test Suite

---

**Ready to implement? Let's make AgentMaestro secure! 🔒**
