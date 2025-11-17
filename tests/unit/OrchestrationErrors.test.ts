import { describe, it, expect } from '@jest/globals';
import {
  OrchestrationError,
  AgentExecutionError as AgentExecutionErrorOrch,
  OutputProcessingError,
  SessionError,
  ValidationError,
  TimeoutError
} from '../../src/shared/errors/OrchestrationErrors.js';

describe('OrchestrationErrors', () => {
  describe('OrchestrationError', () => {
    it('should create error with message', () => {
      const error = new OrchestrationError('ORCHESTRATION_ERROR', 'Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('OrchestrationError');
      expect(error.code).toBe('ORCHESTRATION_ERROR');
    });

    it('should include context', () => {
      const context = { foo: 'bar', num: 123 };
      const error = new OrchestrationError('ORCHESTRATION_ERROR', 'Test error', context);
      expect(error.context).toEqual(context);
    });
  });

  describe('AgentExecutionError', () => {
    it('should create error with agent name', () => {
      const error = new AgentExecutionErrorOrch('claude', 'Execution failed');
      expect(error.message).toBe('Execution failed');
      expect(error.agentName).toBe('claude');
      expect(error.code).toBe('AGENT_EXECUTION_ERROR');
    });

    it('should include exit code', () => {
      const error = new AgentExecutionErrorOrch('claude', 'Failed', 1);
      expect(error.exitCode).toBe(1);
    });

    it('should include agent name in context', () => {
      const error = new AgentExecutionErrorOrch('claude', 'Failed');
      expect(error.context?.agentName).toBe('claude');
    });
  });

  describe('OutputProcessingError', () => {
    it('should create error with agent and output', () => {
      const error = new OutputProcessingError(
        'claude',
        'Parse failed',
        'raw output data'
      );
      expect(error.agentName).toBe('claude');
      expect(error.rawOutput).toBe('raw output data');
    });

    it('should truncate output preview in context', () => {
      const longOutput = 'a'.repeat(200);
      const error = new OutputProcessingError('claude', 'Failed', longOutput);
      const preview = error.context?.outputPreview as string;
      expect(preview.length).toBeLessThanOrEqual(100);
    });
  });

  describe('SessionError', () => {
    it('should create error with session ID', () => {
      const error = new SessionError('Session failed', 'session-123');
      expect(error.sessionId).toBe('session-123');
      expect(error.context?.sessionId).toBe('session-123');
    });
  });

  describe('ValidationError', () => {
    it('should create error with validation errors', () => {
      const errors = ['Error 1', 'Error 2'];
      const error = new ValidationError('Validation failed', errors);
      expect(error.validationErrors).toEqual(errors);
      expect(error.context?.validationErrors).toEqual(errors);
    });
  });

  describe('TimeoutError', () => {
    it('should create error with timeout value', () => {
      const error = new TimeoutError('Timed out', 5000);
      expect(error.timeoutMs).toBe(5000);
      expect(error.context?.timeoutMs).toBe(5000);
    });
  });

  describe('Error inheritance', () => {
    it('should be instanceof Error', () => {
      const error = new OrchestrationError('ORCHESTRATION_ERROR', 'Test');
      expect(error instanceof Error).toBe(true);
    });

    it('should preserve stack trace', () => {
      const error = new AgentExecutionErrorOrch('claude', 'Failed');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AgentExecutionError');
    });
  });
});
