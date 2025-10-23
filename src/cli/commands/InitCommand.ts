/**
 * InitCommand - Initialize AgentMaestro with Claude Code integration
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConsoleLogger } from '../../features/ui/index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class InitCommand {
  private static logger = new ConsoleLogger();

  /**
   * Register the init command
   */
  static register(program: Command): void {
    program
      .command('init')
      .description('Initialize AgentMaestro with Claude Code integration')
      .action(async () => {
        await this.execute();
      });
  }

  /**
   * Execute the init command
   */
  static async execute(): Promise<void> {
    this.logger.header('Initializing AgentMaestro with Claude Code');

    try {
      // Step 1: Check if Claude Code is installed
      if (!(await this.isClaudeInstalled())) {
        this.logger.error('\n❌ Claude Code is not installed');
        this.logger.info('\nInstall Claude Code first:');
        this.logger.info('  npm install -g @anthropic/claude-code');
        this.logger.info('  or visit: https://docs.claude.com/en/docs/claude-code\n');
        process.exit(1);
      }

      // Step 2: Run claude init (if .claude/ doesn't exist)
      if (!fs.existsSync('.claude')) {
        this.logger.info('\n📦 Running claude init...');
        await this.runClaudeInit();
        this.logger.success('✓ Claude Code initialized');
      } else {
        this.logger.info('\n✓ .claude/ directory already exists');
      }

      // Step 3: Register the AgentMaestro plugin marketplace
      await this.registerMarketplace();

      // Step 4: Install or update the AgentMaestro delegation plugin
      await this.installPlugin();

      // Step 5: Verify that key plugin components were installed
      await this.verifyInstallation();

      // Success
      this.logger.separator();
      this.logger.success('\n✅ AgentMaestro initialized successfully!\n');
      this.logger.info('📖 Next steps:\n');
      this.logger.info('   1. Run: maestro');
      this.logger.info('      Start interactive session with Claude Code\n');
      this.logger.info('   2. Within Claude run: /plugin');
      this.logger.info('      Confirm "maestro-delegation-suite" is listed and enabled\n');
      this.logger.info('   3. Use: /delegate <agent> <task>');
      this.logger.info('      Delegate from within Claude Code sessions\n');

    } catch (error) {
      this.logger.error(`\n❌ Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  /**
   * Check if Claude Code is installed
   */
  private static async isClaudeInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('claude', ['--version'], { stdio: 'ignore' });
      process.on('error', () => resolve(false));
      process.on('exit', (code) => resolve(code === 0));
      setTimeout(() => {
        process.kill();
        resolve(false);
      }, 2000);
    });
  }

  /**
   * Run claude init
   */
  private static async runClaudeInit(): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('claude', ['init'], {
        stdio: 'inherit',
        shell: true
      });

      proc.on('error', (error) => reject(error));
      proc.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`claude init exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Register the AgentMaestro marketplace with Claude Code
   */
  private static async registerMarketplace(): Promise<void> {
    this.logger.info('\n🛒 Registering AgentMaestro plugin marketplace...');

    const repoRoot = this.getRepoRoot();
    const marketplaceManifest = path.join(repoRoot, '.claude-plugin', 'marketplace.json');

    if (!fs.existsSync(marketplaceManifest)) {
      throw new Error(`Marketplace manifest not found at ${marketplaceManifest}`);
    }

    const result = await this.runClaudeCommand(['plugin', 'marketplace', 'add', repoRoot]);

    if (result.code === 0) {
      this.logger.success('   ✓ Marketplace added (agent-maestro)');
      return;
    }

    const combined = `${result.stdout}\n${result.stderr}`.trim();
    if (combined.includes('already installed')) {
      this.logger.info('   ↻ Marketplace already registered');
      return;
    }

    throw new Error(combined.length > 0 ? combined : 'Failed to register marketplace');
  }

  /**
   * Install the AgentMaestro delegation plugin
   */
  private static async installPlugin(): Promise<void> {
    this.logger.info('\n🔌 Installing maestro-delegation-suite plugin...');
    const result = await this.runClaudeCommand(['plugin', 'install', 'maestro-delegation-suite@agent-maestro']);

    if (result.code === 0) {
      const message = result.stdout.trim().replace(/^✔\s*/, '') || 'Plugin installed';
      this.logger.success(`   ✓ ${message}`);
      return;
    }

    const combined = `${result.stdout}\n${result.stderr}`.trim();
    throw new Error(combined.length > 0 ? combined : 'Failed to install plugin');
  }

  /**
   * Helper: Run a Claude CLI command and capture output
   */
  private static async runClaudeCommand(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const proc = spawn('claude', args, { shell: false });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        resolve({ code: 1, stdout, stderr: error.message });
      });

      proc.on('close', (code) => {
        resolve({ code: code ?? 1, stdout, stderr });
      });
    });
  }

  /**
   * Helper: Determine the repository root where plugin assets live
   */
  private static getRepoRoot(): string {
    return path.resolve(__dirname, '../../../');
  }

  /**
   * Verify that the essential plugin artifacts were installed into ~/.claude
   */
  private static async verifyInstallation(): Promise<void> {
    this.logger.info('\n🔎 Verifying plugin installation...');

    const repoRoot = this.getRepoRoot();
    const pluginRoot = path.join(repoRoot, 'plugins', 'maestro-delegation-suite');
    const checks: Array<{ label: string; path: string }> = [
      { label: 'Delegation skill', path: path.join(pluginRoot, 'skills', 'maestro-delegation-advisor', 'SKILL.md') },
      { label: 'Codex delegator', path: path.join(pluginRoot, 'agents', 'codex-delegator.md') },
      { label: 'Gemini delegator', path: path.join(pluginRoot, 'agents', 'gemini-delegator.md') },
      { label: '/delegate command', path: path.join(pluginRoot, 'commands', 'delegate.md') }
    ];

    let allGood = true;
    for (const check of checks) {
      if (fs.existsSync(check.path)) {
        this.logger.success(`   ✓ ${check.label} found (${check.path})`);
      } else {
        allGood = false;
        this.logger.warn(`   ⚠️  ${check.label} missing (${check.path})`);
      }
    }

    if (!allGood) {
      this.logger.warn('\n⚠️  Some plugin files are missing. Ensure the repository includes the full `plugins/maestro-delegation-suite` directory before pushing to Git.');
    }

    const pluginId = 'maestro-delegation-suite@agent-maestro';
    if (this.isPluginEnabled(pluginId)) {
      this.logger.success(`   ✓ Plugin enabled in ~/.claude/settings.json (${pluginId})`);
    } else {
      this.logger.warn(`   ⚠️  Plugin not yet enabled in ~/.claude/settings.json (missing ${pluginId})`);
      this.logger.warn('      Open Claude Code, trust this repository, then rerun `maestro init` if needed.');
    }
  }

  /**
   * Helper: check whether a plugin is enabled in ~/.claude/settings.json
   */
  private static isPluginEnabled(pluginId: string): boolean {
    try {
      const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
      if (!fs.existsSync(settingsPath)) {
        return false;
      }

      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(raw);
      if (settings?.plugins && typeof settings.plugins === 'object') {
        if (settings.plugins[pluginId]) {
          return true;
        }
      }
      if (settings?.enabledPlugins && typeof settings.enabledPlugins === 'object') {
        if (settings.enabledPlugins[pluginId]) {
          return true;
        }
      }
      return Boolean(settings?.[pluginId]);
    } catch {
      return false;
    }
  }
}
