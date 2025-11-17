import { describe, it, expect } from '@jest/globals';
import { BaseError } from '../../src/shared/errors/BaseError.js';
import {
  AgentNotFoundError,
  AgentNotAvailableError,
  AgentExecutionError,
  AgentTimeoutError,
  AgentConfigError
} from '../../src/shared/errors/AgentErrors.js';
import {
  PTYError,
  PTYSpawnError,
  PTYProcessNotFoundError,
  PTYProcessNotRunningError,
  PTYWriteError
} from '../../src/shared/errors/PTYErrors.js';
import { ConfigValidationError } from '../../src/shared/errors/ConfigErrors.js';

// Create a concrete implementation for testing BaseError
class TestError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TEST_ERROR', context);
  }
}

describe('BaseError', () => {
  describe('Constructor', () => {
    it('should create error with message and code', () => {
      const error = new TestError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('TestError');
    });

    it('should create error with context', () => {
      const context = { key: 'value', number: 42 };
      const error = new TestError('Test message', context);

      expect(error.context).toEqual(context);
    });

    it('should set timestamp', () => {
      const before = new Date();
      const error = new TestError('Test');
      const after = new Date();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should be instance of Error', () => {
      const error = new TestError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
    });
  });

  describe('toFormattedString', () => {
    it('should format error without context', () => {
      const error = new TestError('Test message');
      const formatted = error.toFormattedString();

      expect(formatted).toBe('[TEST_ERROR] Test message');
    });

    it('should format error with context', () => {
      const error = new TestError('Test message', { key: 'value' });
      const formatted = error.toFormattedString();

      expect(formatted).toContain('[TEST_ERROR] Test message');
      expect(formatted).toContain('Context:');
      expect(formatted).toContain('"key"');
      expect(formatted).toContain('"value"');
    });
  });

  describe('toJSON', () => {
    it('should create JSON representation', () => {
      const error = new TestError('Test message', { key: 'value' });
      const json = error.toJSON();

      expect(json.name).toBe('TestError');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.message).toBe('Test message');
      expect(json.context).toEqual({ key: 'value' });
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });

    it('should include ISO timestamp', () => {
      const error = new TestError('Test');
      const json = error.toJSON();

      expect(typeof json.timestamp).toBe('string');
      expect(new Date(json.timestamp as string)).toBeInstanceOf(Date);
    });
  });
});

describe('AgentErrors', () => {
  describe('AgentNotFoundError', () => {
    it('should create error with agent name', () => {
      const error = new AgentNotFoundError('claude');

      expect(error.message).toContain('claude');
      expect(error.message).toContain('not found');
      expect(error.code).toBe('AGENT_NOT_FOUND');
      expect(error.context?.agentName).toBe('claude');
    });
  });

  describe('AgentNotAvailableError', () => {
    it('should create error with agent and package names', () => {
      const error = new AgentNotAvailableError('claude', '@anthropic/claude-cli');

      expect(error.message).toContain('claude');
      expect(error.message).toContain('not installed');
      expect(error.code).toBe('AGENT_NOT_AVAILABLE');
      expect(error.context?.agentName).toBe('claude');
      expect(error.context?.packageName).toBe('@anthropic/claude-cli');
    });

    it('should have packageName getter', () => {
      const error = new AgentNotAvailableError('claude', '@anthropic/claude-cli');

      expect(error.packageName).toBe('@anthropic/claude-cli');
    });
  });

  describe('AgentExecutionError', () => {
    it('should create error with agent name and reason', () => {
      const error = new AgentExecutionError('claude', 'Process crashed');

      expect(error.message).toContain('claude');
      expect(error.message).toContain('Process crashed');
      expect(error.code).toBe('AGENT_EXECUTION_ERROR');
      expect(error.context?.agentName).toBe('claude');
      expect(error.context?.reason).toBe('Process crashed');
    });

    it('should include exit code when provided', () => {
      const error = new AgentExecutionError('claude', 'Non-zero exit', 1);

      expect(error.context?.exitCode).toBe(1);
    });
  });

  describe('AgentTimeoutError', () => {
    it('should create error with timeout information', () => {
      const error = new AgentTimeoutError('claude', 30000);

      expect(error.message).toContain('claude');
      expect(error.message).toContain('30000');
      expect(error.message).toContain('timed out');
      expect(error.code).toBe('AGENT_TIMEOUT');
      expect(error.context?.agentName).toBe('claude');
      expect(error.context?.timeoutMs).toBe(30000);
    });
  });

  describe('AgentConfigError', () => {
    it('should create error with configuration details', () => {
      const error = new AgentConfigError('claude', 'Invalid API key');

      expect(error.message).toContain('claude');
      expect(error.message).toContain('Invalid API key');
      expect(error.code).toBe('AGENT_CONFIG_ERROR');
      expect(error.context?.agentName).toBe('claude');
      expect(error.context?.reason).toBe('Invalid API key');
    });
  });
});

describe('PTYErrors', () => {
  describe('PTYError', () => {
    it('should create generic PTY error', () => {
      const error = new PTYError('Something went wrong');

      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('PTY_ERROR');
    });

    it('should accept context', () => {
      const error = new PTYError('Error message', { detail: 'info' });

      expect(error.context?.detail).toBe('info');
    });
  });

  describe('PTYSpawnError', () => {
    it('should create spawn error with troubleshooting info', () => {
      const error = new PTYSpawnError('claude', 'Command not found');

      expect(error.message).toContain('claude');
      expect(error.message).toContain('Command not found');
      expect(error.message).toContain('Troubleshooting');
      expect(error.message).toContain('which claude');
      expect(error.code).toBe('PTY_SPAWN_ERROR');
      expect(error.context?.command).toBe('claude');
      expect(error.context?.reason).toBe('Command not found');
    });
  });

  describe('PTYProcessNotFoundError', () => {
    it('should create process not found error', () => {
      const error = new PTYProcessNotFoundError('proc-123');

      expect(error.message).toContain('proc-123');
      expect(error.message).toContain('not found');
      expect(error.code).toBe('PTY_PROCESS_NOT_FOUND');
      expect(error.context?.processId).toBe('proc-123');
    });
  });

  describe('PTYProcessNotRunningError', () => {
    it('should create process not running error', () => {
      const error = new PTYProcessNotRunningError('proc-123');

      expect(error.message).toContain('proc-123');
      expect(error.message).toContain('not running');
      expect(error.code).toBe('PTY_PROCESS_NOT_RUNNING');
      expect(error.context?.processId).toBe('proc-123');
    });
  });

  describe('PTYWriteError', () => {
    it('should create write error with troubleshooting info', () => {
      const error = new PTYWriteError('proc-123', 'Stream closed');

      expect(error.message).toContain('proc-123');
      expect(error.message).toContain('Stream closed');
      expect(error.message).toContain('Possible causes');
      expect(error.code).toBe('PTY_WRITE_ERROR');
      expect(error.context?.processId).toBe('proc-123');
      expect(error.context?.reason).toBe('Stream closed');
    });
  });
});

describe('ConfigErrors', () => {
  describe('ConfigValidationError', () => {
    it('should create error with validation errors', () => {
      const errors = ['Error 1', 'Error 2', 'Error 3'];
      const error = new ConfigValidationError(errors);

      expect(error.message).toContain('Error 1');
      expect(error.message).toContain('Error 2');
      expect(error.message).toContain('Error 3');
      expect(error.code).toBe('CONFIG_VALIDATION_ERROR');
      expect(error.context?.errors).toEqual(errors);
    });

    it('should have errors getter', () => {
      const errors = ['Error 1', 'Error 2'];
      const error = new ConfigValidationError(errors);

      expect(error.errors).toEqual(errors);
    });

    it('should handle single error', () => {
      const error = new ConfigValidationError(['Single error']);

      expect(error.message).toContain('Single error');
      expect(error.errors).toHaveLength(1);
    });

    it('should handle empty errors array', () => {
      const error = new ConfigValidationError([]);

      expect(error.errors).toHaveLength(0);
    });
  });
});

describe('Error Inheritance', () => {
  it('should maintain proper inheritance chain', () => {
    const agentError = new AgentNotFoundError('test');
    const ptyError = new PTYError('test');
    const configError = new ConfigValidationError(['test']);

    expect(agentError).toBeInstanceOf(BaseError);
    expect(agentError).toBeInstanceOf(Error);

    expect(ptyError).toBeInstanceOf(BaseError);
    expect(ptyError).toBeInstanceOf(Error);

    expect(configError).toBeInstanceOf(BaseError);
    expect(configError).toBeInstanceOf(Error);
  });

  it('should be catchable as Error', () => {
    try {
      throw new AgentNotFoundError('test');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('should be catchable as BaseError', () => {
    try {
      throw new PTYSpawnError('test', 'reason');
    } catch (e) {
      expect(e).toBeInstanceOf(BaseError);
    }
  });
});
