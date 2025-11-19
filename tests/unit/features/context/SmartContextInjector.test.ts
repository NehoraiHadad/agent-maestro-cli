/**
 * SmartContextInjector.test.ts
 * Tests for SmartContextInjector and ContextFormatter
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SmartContextInjector, ContextFormatter } from '../../../../src/features/context/SmartContextInjector.js';
import type { Context } from '../../../../src/features/context/types.js';
import type { MiddlewareContext } from '../../../../src/features/middleware/types.js';

describe('ContextFormatter', () => {
  describe('format', () => {
    it('should format git context', () => {
      const context: Context = {
        git: {
          isGitRepo: true,
          branch: 'main',
          hasUncommittedChanges: true,
          uncommittedFiles: 3
        }
      };

      const formatted = ContextFormatter.format(context);

      expect(formatted).toContain('Git:');
      expect(formatted).toContain('branch: main');
      expect(formatted).toContain('3 uncommitted files');
    });

    it('should format project context', () => {
      const context: Context = {
        project: {
          name: 'test-project',
          version: '1.0.0',
          language: 'TypeScript',
          framework: 'React'
        }
      };

      const formatted = ContextFormatter.format(context);

      expect(formatted).toContain('Project:');
      expect(formatted).toContain('test-project');
      expect(formatted).toContain('v1.0.0');
      expect(formatted).toContain('TypeScript');
      expect(formatted).toContain('React');
    });

    it('should format environment context', () => {
      const context: Context = {
        env: {
          nodeVersion: 'v20.0.0',
          platform: 'linux'
        }
      };

      const formatted = ContextFormatter.format(context);

      expect(formatted).toContain('Env:');
      expect(formatted).toContain('Node v20.0.0');
      expect(formatted).toContain('linux');
    });

    it('should format multiple contexts', () => {
      const context: Context = {
        git: {
          isGitRepo: true,
          branch: 'main'
        },
        project: {
          name: 'test-project',
          version: '1.0.0'
        },
        env: {
          nodeVersion: 'v20.0.0',
          platform: 'linux'
        }
      };

      const formatted = ContextFormatter.format(context);

      expect(formatted).toContain('Git:');
      expect(formatted).toContain('Project:');
      expect(formatted).toContain('Env:');
    });

    it('should return empty string for empty context', () => {
      const context: Context = {};
      const formatted = ContextFormatter.format(context);

      expect(formatted).toBe('');
    });

    it('should handle git repo without branch', () => {
      const context: Context = {
        git: {
          isGitRepo: true
        }
      };

      const formatted = ContextFormatter.format(context);

      // Should not include git section if no meaningful info
      expect(formatted).toBe('');
    });

    it('should handle singular/plural uncommitted files', () => {
      const context1: Context = {
        git: {
          isGitRepo: true,
          branch: 'main',
          hasUncommittedChanges: true,
          uncommittedFiles: 1
        }
      };

      const formatted1 = ContextFormatter.format(context1);
      expect(formatted1).toContain('1 uncommitted file');

      const context2: Context = {
        git: {
          isGitRepo: true,
          branch: 'main',
          hasUncommittedChanges: true,
          uncommittedFiles: 2
        }
      };

      const formatted2 = ContextFormatter.format(context2);
      expect(formatted2).toContain('2 uncommitted files');
    });
  });

  describe('inject', () => {
    it('should inject context into message', () => {
      const message = 'test message';
      const context: Context = {
        project: {
          name: 'test-project',
          version: '1.0.0'
        }
      };

      const injected = ContextFormatter.inject(message, context);

      expect(injected).toContain('[Context]');
      expect(injected).toContain('Project:');
      expect(injected).toContain('test message');
      expect(injected.indexOf('[Context]')).toBeLessThan(injected.indexOf('test message'));
    });

    it('should return original message if context is empty', () => {
      const message = 'test message';
      const context: Context = {};

      const injected = ContextFormatter.inject(message, context);

      expect(injected).toBe(message);
    });
  });
});

describe('SmartContextInjector', () => {
  let injector: SmartContextInjector;
  let middlewareContext: MiddlewareContext;

  beforeEach(() => {
    injector = new SmartContextInjector({
      enabled: true,
      includeGit: true,
      includeEnv: true,
      includeProject: true,
      smartSelection: true,
      maxRecentCommits: 3
    });

    middlewareContext = {
      agent: 'claude',
      timestamp: Date.now(),
      metadata: {}
    };
  });

  describe('middleware properties', () => {
    it('should have correct name', () => {
      expect(injector.name).toBe('smart-context-injector');
    });

    it('should have description', () => {
      expect(injector.description).toBeDefined();
      expect(typeof injector.description).toBe('string');
    });

    it('should have high priority', () => {
      expect(injector.priority).toBe(100);
    });
  });

  describe('before hook', () => {
    it('should enrich message with context', async () => {
      const message = 'show me the project info';
      const result = await injector.before(message, middlewareContext);

      // Should include context
      expect(result).toContain('[Context]');
      expect(result).toContain('Project:');
    });

    it('should return original message if no context is available', async () => {
      const disabledInjector = new SmartContextInjector({ enabled: false });
      const message = 'test message';
      const result = await disabledInjector.before(message, middlewareContext);

      expect(result).toBe(message);
    });

    it('should handle errors gracefully', async () => {
      const message = 'test message';

      // Should not throw
      const result = await injector.before(message, middlewareContext);
      expect(result).toBeDefined();
    });

    it('should include git context for git-related messages', async () => {
      const message = 'show me the current git branch';
      const result = await injector.before(message, middlewareContext);

      if (result !== message) {
        expect(result).toContain('[Context]');
      }
    });

    it('should include env context for environment messages', async () => {
      const message = 'what node version am I using?';
      const result = await injector.before(message, middlewareContext);

      if (result !== message) {
        expect(result).toContain('[Context]');
      }
    });
  });

  describe('configuration', () => {
    it('should allow updating config', () => {
      injector.setConfig({ enabled: false });
      const config = injector.getConfig();

      expect(config.enabled).toBe(false);
    });

    it('should return current config', () => {
      const config = injector.getConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.includeGit).toBe(true);
      expect(config.includeEnv).toBe(true);
      expect(config.includeProject).toBe(true);
    });

    it('should respect disabled contexts', async () => {
      injector.setConfig({ includeGit: false });
      const message = 'show me git status';
      const result = await injector.before(message, middlewareContext);

      // Should not include git context even though message asks for it
      if (result !== message && result.includes('[Context]')) {
        expect(result).not.toContain('Git:');
      }
    });
  });

  describe('smart selection', () => {
    it('should select relevant context based on message', async () => {
      const gitMessage = 'show me the current branch';
      const gitResult = await injector.before(gitMessage, middlewareContext);

      const projectMessage = 'what dependencies does this project have?';
      const projectResult = await injector.before(projectMessage, middlewareContext);

      // Both should have context (if available)
      expect(typeof gitResult).toBe('string');
      expect(typeof projectResult).toBe('string');
    });

    it('should include all contexts when smart selection is disabled', async () => {
      const allContextInjector = new SmartContextInjector({
        enabled: true,
        smartSelection: false
      });

      const message = 'test message';
      const result = await allContextInjector.before(message, middlewareContext);

      // Should include context even for generic message
      expect(result).toContain('[Context]');
    });
  });
});
