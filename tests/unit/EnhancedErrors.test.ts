/**
 * Tests for enhanced error classes
 */

import { describe, it, expect } from '@jest/globals';
import { MaestroError, AgentError } from '../../src/shared/errors/index.js';

describe('Enhanced Error Classes', () => {
  describe('MaestroError', () => {
    it('should create error with all properties', () => {
      const context = { key: 'value' };
      const error = new MaestroError('Test message', 'TEST_CODE', context, true);

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.context).toEqual(context);
      expect(error.isRetryable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('MaestroError');
    });

    it('should create error with defaults', () => {
      const error = new MaestroError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('MAESTRO_ERROR');
      expect(error.context).toBeUndefined();
      expect(error.isRetryable).toBe(false);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should format details correctly', () => {
      const error = new MaestroError('Test error', 'TEST_CODE', { foo: 'bar' }, true);
      const details = error.getDetails();

      expect(details).toContain('TEST_CODE');
      expect(details).toContain('Test error');
      expect(details).toContain('foo');
      expect(details).toContain('bar');
      expect(details).toContain('Retryable: Yes');
    });

    it('should format details without context', () => {
      const error = new MaestroError('Test error', 'TEST_CODE');
      const details = error.getDetails();

      expect(details).toContain('TEST_CODE');
      expect(details).toContain('Test error');
      expect(details).not.toContain('Context:');
    });

    it('should convert to JSON', () => {
      const context = { key: 'value' };
      const error = new MaestroError('Test message', 'TEST_CODE', context, true);
      const json = error.toJSON();

      expect(json.name).toBe('MaestroError');
      expect(json.code).toBe('TEST_CODE');
      expect(json.message).toBe('Test message');
      expect(json.context).toEqual(context);
      expect(json.isRetryable).toBe(true);
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });

    it('should maintain stack trace', () => {
      const error = new MaestroError('Test error', 'TEST_CODE');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('MaestroError');
    });
  });

  describe('AgentError', () => {
    it('should create error with all properties', () => {
      const context = { attempt: 1 };
      const error = new AgentError('claude', 'Agent failed', 'SPAWN_ERROR', 1, context, true);

      expect(error.agentName).toBe('claude');
      expect(error.message).toBe('Agent failed');
      expect(error.code).toBe('SPAWN_ERROR');
      expect(error.exitCode).toBe(1);
      expect(error.context).toEqual(context);
      expect(error.isRetryable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('AgentError');
    });

    it('should create error with defaults', () => {
      const error = new AgentError('claude', 'Agent failed');

      expect(error.agentName).toBe('claude');
      expect(error.message).toBe('Agent failed');
      expect(error.code).toBe('AGENT_ERROR');
      expect(error.exitCode).toBeUndefined();
      expect(error.context).toBeUndefined();
      expect(error.isRetryable).toBe(false);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should format details correctly', () => {
      const error = new AgentError('claude', 'Spawn failed', 'SPAWN_ERROR', 127, { path: '/usr/bin/claude' }, true);
      const details = error.getDetails();

      expect(details).toContain('SPAWN_ERROR');
      expect(details).toContain('claude');
      expect(details).toContain('Spawn failed');
      expect(details).toContain('Exit Code: 127');
      expect(details).toContain('path');
      expect(details).toContain('/usr/bin/claude');
      expect(details).toContain('Retryable: Yes');
    });

    it('should format details without exit code', () => {
      const error = new AgentError('claude', 'Agent failed', 'AGENT_ERROR');
      const details = error.getDetails();

      expect(details).toContain('AGENT_ERROR');
      expect(details).toContain('claude');
      expect(details).toContain('Agent failed');
      expect(details).not.toContain('Exit Code:');
    });

    it('should convert to JSON', () => {
      const context = { attempt: 1 };
      const error = new AgentError('claude', 'Agent failed', 'SPAWN_ERROR', 1, context, true);
      const json = error.toJSON();

      expect(json.name).toBe('AgentError');
      expect(json.agentName).toBe('claude');
      expect(json.code).toBe('SPAWN_ERROR');
      expect(json.message).toBe('Agent failed');
      expect(json.exitCode).toBe(1);
      expect(json.context).toEqual(context);
      expect(json.isRetryable).toBe(true);
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });

    it('should maintain stack trace', () => {
      const error = new AgentError('claude', 'Test error', 'TEST_ERROR');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AgentError');
    });
  });
});
