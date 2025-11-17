import { ValidationResult, ValidationOptions } from '../types/validation.types.js';

/**
 * Input validator for user messages and commands
 */
export class InputValidator {
  private static readonly DEFAULT_MAX_LENGTH = 100000;
  private static readonly DEFAULT_MIN_LENGTH = 1;

  // Dangerous patterns that should trigger warnings
  private static readonly DANGEROUS_PATTERNS = [
    { pattern: /\$\(.*?\)/, name: 'Command substitution' },
    { pattern: /`.*?`/, name: 'Backtick execution' },
    { pattern: /;\s*rm\s+-rf/i, name: 'Destructive command' },
    { pattern: />\s*\/dev\/null/, name: 'Output redirection' },
    { pattern: /&&|\|\|/, name: 'Command chaining' },
    { pattern: /<script.*?>/i, name: 'Script tag' },
    { pattern: /eval\s*\(/i, name: 'Eval function' },
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
