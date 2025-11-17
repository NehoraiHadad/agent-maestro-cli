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

    it('should reject whitespace-only messages', () => {
      const result = InputValidator.validateMessage('   ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message cannot be empty');
    });

    it('should reject messages exceeding max length', () => {
      const longMessage = 'a'.repeat(100001);
      const result = InputValidator.validateMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum length');
    });

    it('should reject messages below min length when specified', () => {
      const result = InputValidator.validateMessage('hi', { minLength: 5 });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be at least 5 characters');
    });

    it('should accept messages at exact max length', () => {
      const message = 'a'.repeat(100000);
      const result = InputValidator.validateMessage(message);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about command substitution patterns', () => {
      const result = InputValidator.validateMessage('Execute $(rm -rf /)');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Command substitution');
    });

    it('should warn about backtick execution', () => {
      const result = InputValidator.validateMessage('Run `malicious command`');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Backtick execution'))).toBe(true);
    });

    it('should warn about destructive commands', () => {
      const result = InputValidator.validateMessage('test; rm -rf /');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Destructive command'))).toBe(true);
    });

    it('should warn about output redirection', () => {
      const result = InputValidator.validateMessage('echo test > /dev/null');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Output redirection'))).toBe(true);
    });

    it('should warn about command chaining with &&', () => {
      const result = InputValidator.validateMessage('cmd1 && cmd2');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Command chaining'))).toBe(true);
    });

    it('should warn about command chaining with ||', () => {
      const result = InputValidator.validateMessage('cmd1 || cmd2');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Command chaining'))).toBe(true);
    });

    it('should warn about script tags', () => {
      const result = InputValidator.validateMessage('<script>alert("xss")</script>');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Script tag'))).toBe(true);
    });

    it('should warn about eval function', () => {
      const result = InputValidator.validateMessage('eval("malicious code")');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Eval function'))).toBe(true);
    });

    it('should reject null bytes', () => {
      const result = InputValidator.validateMessage('Hello\0World');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message contains null bytes');
    });

    it('should warn about excessive newlines', () => {
      const message = 'line\n'.repeat(1001);
      const result = InputValidator.validateMessage(message);
      expect(result.warnings.some(w => w.includes('excessive newlines'))).toBe(true);
    });

    it('should not warn about reasonable number of newlines', () => {
      const message = 'line\n'.repeat(100);
      const result = InputValidator.validateMessage(message);
      expect(result.warnings.some(w => w.includes('excessive newlines'))).toBe(false);
    });

    it('should sanitize message when requested', () => {
      const result = InputValidator.validateMessage('  Hello\0World  ', { sanitize: true });
      expect(result.sanitizedValue).toBe('HelloWorld');
    });

    it('should not return sanitized value when not requested', () => {
      const result = InputValidator.validateMessage('  Hello World  ');
      expect(result.sanitizedValue).toBeUndefined();
    });

    it('should handle multiple dangerous patterns in one message', () => {
      const result = InputValidator.validateMessage('Execute $(cmd) && `backtick` && eval("test")');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(2);
    });

    it('should reject undefined input', () => {
      const result = InputValidator.validateMessage(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message must be a string');
    });

    it('should reject null input', () => {
      const result = InputValidator.validateMessage(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message must be a string');
    });

    it('should reject object input', () => {
      const result = InputValidator.validateMessage({ message: 'test' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message must be a string');
    });

    it('should reject array input', () => {
      const result = InputValidator.validateMessage(['test']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message must be a string');
    });
  });

  describe('validateCommandName', () => {
    it('should accept valid command names', () => {
      const result = InputValidator.validateCommandName('claude');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept command names with dashes', () => {
      const result = InputValidator.validateCommandName('my-command');
      expect(result.isValid).toBe(true);
    });

    it('should accept command names with underscores', () => {
      const result = InputValidator.validateCommandName('my_command');
      expect(result.isValid).toBe(true);
    });

    it('should accept command names with dots', () => {
      const result = InputValidator.validateCommandName('my.command');
      expect(result.isValid).toBe(true);
    });

    it('should accept command names with numbers', () => {
      const result = InputValidator.validateCommandName('command123');
      expect(result.isValid).toBe(true);
    });

    it('should reject commands with path separators (forward slash)', () => {
      const result = InputValidator.validateCommandName('/bin/bash');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command name cannot contain path separators');
    });

    it('should reject commands with path separators (backslash)', () => {
      const result = InputValidator.validateCommandName('bin\\bash');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command name cannot contain path separators');
    });

    it('should reject commands with path traversal', () => {
      const result = InputValidator.validateCommandName('../bin/bash');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command name cannot contain path separators');
    });

    it('should reject commands with special characters (space)', () => {
      const result = InputValidator.validateCommandName('rm -rf');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command name contains invalid characters');
    });

    it('should reject commands with special characters (!)', () => {
      const result = InputValidator.validateCommandName('command!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command name contains invalid characters');
    });

    it('should reject commands with special characters ($)', () => {
      const result = InputValidator.validateCommandName('$command');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command name contains invalid characters');
    });

    it('should reject non-string command names', () => {
      const result = InputValidator.validateCommandName(123);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command must be a string');
    });

    it('should reject null command names', () => {
      const result = InputValidator.validateCommandName(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command must be a string');
    });
  });

  describe('validatePath', () => {
    it('should accept valid paths', () => {
      const result = InputValidator.validatePath('/home/user/project');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept relative paths without traversal', () => {
      const result = InputValidator.validatePath('src/utils/helper.ts');
      expect(result.isValid).toBe(true);
    });

    it('should accept paths with dots in filenames', () => {
      const result = InputValidator.validatePath('/home/user/file.name.txt');
      expect(result.isValid).toBe(true);
    });

    it('should reject path traversal with ..', () => {
      const result = InputValidator.validatePath('/home/../etc/passwd');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path cannot contain traversal sequences (..)');
    });

    it('should reject relative path traversal', () => {
      const result = InputValidator.validatePath('../../../etc/passwd');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path cannot contain traversal sequences (..)');
    });

    it('should reject paths with null bytes', () => {
      const result = InputValidator.validatePath('/home/user\0/file');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path contains null bytes');
    });

    it('should reject non-string paths', () => {
      const result = InputValidator.validatePath(123);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path must be a string');
    });

    it('should reject null paths', () => {
      const result = InputValidator.validatePath(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path must be a string');
    });

    it('should accept Windows-style paths', () => {
      const result = InputValidator.validatePath('C:\\Users\\user\\project');
      expect(result.isValid).toBe(true);
    });

    it('should reject path traversal in Windows paths', () => {
      const result = InputValidator.validatePath('C:\\Users\\..\\..\\Windows');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path cannot contain traversal sequences (..)');
    });
  });
});
