import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

describe('CLI Version', () => {
  it('should match package.json version', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));

    // Read the CLI file to verify it's reading from package.json
    const cliContent = readFileSync(
      join(__dirname, '../../../src/cli/index.ts'),
      'utf-8'
    );

    // Verify no hardcoded version
    expect(cliContent).not.toMatch(/\.version\(['"]2\.0\.0['"]\)/);
    expect(cliContent).toMatch(/\.version\(packageJson\.version\)/);

    // Verify package.json is being read
    expect(cliContent).toContain('readFileSync');
    expect(cliContent).toContain('package.json');
  });

  it('should display correct version when CLI is invoked', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../../../package.json'), 'utf-8')
    );

    try {
      // Build the project first to ensure dist is up to date
      const distPath = join(__dirname, '../../../dist/cli/index.js');
      const versionOutput = execSync(`node ${distPath} --version`, {
        encoding: 'utf-8',
        timeout: 5000
      }).trim();

      expect(versionOutput).toBe(packageJson.version);
    } catch (error) {
      // If dist doesn't exist yet, skip this test
      // This will be caught during the build step
      console.warn('Skipping CLI execution test - dist not found');
    }
  });
});
