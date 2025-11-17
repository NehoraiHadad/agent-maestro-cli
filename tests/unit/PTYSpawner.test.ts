import { describe, it, expect, beforeEach } from '@jest/globals';
import { PTYSpawner } from '../../src/features/execution/pty/PTYSpawner.js';

describe('PTYSpawner', () => {
  let spawner: PTYSpawner;

  beforeEach(() => {
    spawner = new PTYSpawner();
  });

  describe('Environment Filtering', () => {
    it('should include safe environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        PATH: '/usr/bin',
        HOME: '/home/user',
        USER: 'testuser',
        SHELL: '/bin/bash',
      };

      const stats = spawner.getEnvironmentStats();
      expect(stats.allowedVars).toBe(4);
      expect(stats.filteredVars).toBe(0);

      process.env = originalEnv;
    });

    it('should filter out API keys', () => {
      const originalEnv = process.env;
      process.env = {
        PATH: '/usr/bin',
        OPENAI_API_KEY: 'sk-test123',
        ANTHROPIC_API_KEY: 'sk-ant-test456',
      };

      const stats = spawner.getEnvironmentStats();
      expect(stats.filteredVars).toBeGreaterThan(0);

      process.env = originalEnv;
    });

    it('should filter out tokens', () => {
      const originalEnv = process.env;
      process.env = {
        PATH: '/usr/bin',
        GITHUB_TOKEN: 'ghp_test123',
        NPM_TOKEN: 'npm_test456',
      };

      const stats = spawner.getEnvironmentStats();
      expect(stats.filteredVars).toBeGreaterThan(0);

      process.env = originalEnv;
    });

    it('should filter out secrets and passwords', () => {
      const originalEnv = process.env;
      process.env = {
        PATH: '/usr/bin',
        DATABASE_PASSWORD: 'secret123',
        AWS_SECRET: 'aws-secret',
      };

      const stats = spawner.getEnvironmentStats();
      expect(stats.filteredVars).toBeGreaterThan(0);

      process.env = originalEnv;
    });

    it('should warn about sensitive variables', () => {
      const env = {
        PATH: '/usr/bin',
        DANGEROUS_API_KEY: 'test123',
      };

      const warnings = spawner.validateEnvironmentSafety(env);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('API_KEY'))).toBe(true);
    });

    it('should include optional env vars when enabled', () => {
      const spawnerWithOptional = new PTYSpawner(true);
      const originalEnv = process.env;

      process.env = {
        PATH: '/usr/bin',
        SSH_AUTH_SOCK: '/tmp/ssh-agent.sock',
        GIT_AUTHOR_NAME: 'Test User',
      };

      const stats = spawnerWithOptional.getEnvironmentStats();
      expect(stats.allowedVars).toBeGreaterThan(1);

      process.env = originalEnv;
    });

    it('should not include optional env vars when disabled', () => {
      const spawnerNoOptional = new PTYSpawner(false);
      const originalEnv = process.env;

      process.env = {
        PATH: '/usr/bin',
        SSH_AUTH_SOCK: '/tmp/ssh-agent.sock',
      };

      const stats = spawnerNoOptional.getEnvironmentStats();
      // SSH_AUTH_SOCK should be filtered out
      expect(stats.filteredVars).toBeGreaterThan(0);

      process.env = originalEnv;
    });
  });

  describe('Validation', () => {
    it('should detect non-allowlisted variables', () => {
      const env = {
        PATH: '/usr/bin',
        CUSTOM_VAR: 'value',
      };

      const warnings = spawner.validateEnvironmentSafety(env);
      expect(warnings.some(w => w.includes('Non-allowlisted'))).toBe(true);
    });

    it('should pass validation for safe environment', () => {
      const env = {
        PATH: '/usr/bin',
        HOME: '/home/user',
        SHELL: '/bin/bash',
      };

      const warnings = spawner.validateEnvironmentSafety(env);
      expect(warnings.length).toBe(0);
    });
  });
});
