/**
 * ContextProvider.test.ts
 * Tests for ContextProvider
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContextProvider } from '../../../../src/features/context/ContextProvider.js';

describe('ContextProvider', () => {
  let provider: ContextProvider;
  const testCwd = process.cwd();

  beforeEach(() => {
    provider = new ContextProvider(testCwd);
  });

  describe('getGitContext', () => {
    it('should return git context for a git repository', async () => {
      const context = await provider.getGitContext();

      expect(context).toBeDefined();
      expect(typeof context.isGitRepo).toBe('boolean');

      // If it's a git repo, check for expected fields
      if (context.isGitRepo) {
        expect(context.branch).toBeDefined();
        expect(typeof context.branch).toBe('string');
        expect(typeof context.hasUncommittedChanges).toBe('boolean');
      }
    });

    it('should return isGitRepo: false for non-git directory', async () => {
      const nonGitProvider = new ContextProvider('/tmp');
      const context = await nonGitProvider.getGitContext();

      expect(context.isGitRepo).toBe(false);
    });

    it('should respect includeGit config', async () => {
      const provider = new ContextProvider(testCwd, { includeGit: false });
      const context = await provider.getGitContext();

      expect(Object.keys(context).length).toBe(0);
    });

    it('should limit recent commits based on config', async () => {
      const provider = new ContextProvider(testCwd, { maxRecentCommits: 2 });
      const context = await provider.getGitContext();

      if (context.recentCommits) {
        expect(context.recentCommits.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('getEnvContext', () => {
    it('should return environment context', async () => {
      const context = await provider.getEnvContext();

      expect(context).toBeDefined();
      expect(context.nodeVersion).toBeDefined();
      expect(context.platform).toBeDefined();
      expect(context.arch).toBeDefined();
      expect(context.cwd).toBeDefined();
    });

    it('should include Node.js version', async () => {
      const context = await provider.getEnvContext();

      expect(context.nodeVersion).toBe(process.version);
    });

    it('should include platform information', async () => {
      const context = await provider.getEnvContext();

      expect(context.platform).toBe(process.platform);
      expect(context.arch).toBe(process.arch);
    });

    it('should respect includeEnv config', async () => {
      const provider = new ContextProvider(testCwd, { includeEnv: false });
      const context = await provider.getEnvContext();

      expect(Object.keys(context).length).toBe(0);
    });
  });

  describe('getProjectContext', () => {
    it('should detect package.json', async () => {
      const context = await provider.getProjectContext();

      expect(context).toBeDefined();
      expect(typeof context.hasPackageJson).toBe('boolean');

      // If package.json exists, check for project info
      if (context.hasPackageJson) {
        expect(context.name).toBeDefined();
        expect(context.version).toBeDefined();
      }
    });

    it('should detect project language', async () => {
      const context = await provider.getProjectContext();

      if (context.hasPackageJson) {
        expect(context.language).toBeDefined();
        expect(['JavaScript', 'TypeScript']).toContain(context.language);
      }
    });

    it('should detect README files', async () => {
      const context = await provider.getProjectContext();

      expect(typeof context.hasReadme).toBe('boolean');
    });

    it('should respect includeProject config', async () => {
      const provider = new ContextProvider(testCwd, { includeProject: false });
      const context = await provider.getProjectContext();

      expect(Object.keys(context).length).toBe(0);
    });
  });

  describe('getRelevantContext', () => {
    it('should return empty context when disabled', async () => {
      const provider = new ContextProvider(testCwd, { enabled: false });
      const context = await provider.getRelevantContext('test message');

      expect(Object.keys(context).length).toBe(0);
    });

    it('should include all contexts when smartSelection is disabled', async () => {
      const provider = new ContextProvider(testCwd, { smartSelection: false });
      const context = await provider.getRelevantContext('test message');

      expect(context.git).toBeDefined();
      expect(context.env).toBeDefined();
      expect(context.project).toBeDefined();
    });

    it('should include git context for git-related messages', async () => {
      const messages = [
        'show me git status',
        'what branch am I on?',
        'show recent commits',
        'check git repository'
      ];

      for (const message of messages) {
        const context = await provider.getRelevantContext(message);
        expect(context.git).toBeDefined();
      }
    });

    it('should include env context for environment-related messages', async () => {
      const messages = [
        'what is the node version?',
        'show environment info',
        'what platform am I on?',
        'show current directory'
      ];

      for (const message of messages) {
        const context = await provider.getRelevantContext(message);
        expect(context.env).toBeDefined();
      }
    });

    it('should include project context for project-related messages', async () => {
      const messages = [
        'show project dependencies',
        'what framework is this?',
        'show package.json info',
        'install dependencies'
      ];

      for (const message of messages) {
        const context = await provider.getRelevantContext(message);
        expect(context.project).toBeDefined();
      }
    });

    it('should include project context by default for generic messages', async () => {
      const context = await provider.getRelevantContext('help me with this code');

      // Project context is most useful by default
      expect(context.project).toBeDefined();
    });

    it('should not include disabled contexts', async () => {
      const provider = new ContextProvider(testCwd, {
        smartSelection: true,
        includeGit: false
      });

      const context = await provider.getRelevantContext('show me git status');

      expect(context.git).toBeUndefined();
    });
  });

  describe('setConfig', () => {
    it('should update configuration', () => {
      provider.setConfig({ includeGit: false });
      const config = provider.getConfig();

      expect(config.includeGit).toBe(false);
    });

    it('should merge with existing configuration', () => {
      provider.setConfig({ includeGit: false });
      provider.setConfig({ includeEnv: false });
      const config = provider.getConfig();

      expect(config.includeGit).toBe(false);
      expect(config.includeEnv).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = provider.getConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBeDefined();
      expect(config.includeGit).toBeDefined();
      expect(config.includeEnv).toBeDefined();
      expect(config.includeProject).toBeDefined();
    });
  });
});
