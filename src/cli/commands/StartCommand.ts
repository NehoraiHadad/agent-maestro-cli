/**
 * Start Command
 * Initiates the AgentMaestro orchestration with a selected agent
 */

import { Command } from 'commander';
import { Maestro } from '../../features/orchestration/index.js';
import { AgentRepository } from '../../domain/index.js';
import { InteractiveSession } from '../../features/ui/index.js';
import { ConsoleLogger } from '../../features/ui/index.js';
import { TIMEOUTS } from '../../shared/constants/index.js';

interface StartCommandOptions {
  message?: string;
  verbose?: boolean;
  spinner?: boolean;
  timeout?: string;
  planMode?: boolean;
}

/**
 * StartCommand - handles starting the orchestration
 */
export class StartCommand {
  private static logger = new ConsoleLogger();

  /**
   * Register the start command with the CLI program
   */
  static register(program: Command): void {
    program
      .option('-m, --message <text>', 'single message to send (non-interactive mode)')
      .option('-v, --verbose', 'enable verbose logging')
      .option('--no-spinner', 'disable loading spinners')
      .option('--timeout <ms>', 'inactivity timeout in milliseconds', TIMEOUTS.DEFAULT_INACTIVITY.toString())
      .option('--plan-mode', 'enable plan mode (research and planning without execution)')
      .action(async (options: StartCommandOptions) => {
        await this.execute(options);
      });
  }

  /**
   * Execute the start command
   */
  static async execute(options: StartCommandOptions): Promise<void> {
    try {
      // Always use Claude as the agent
      const agentName = 'claude';

      // Check Claude availability
      const available = await this.checkAvailability(agentName);
      if (!available) {
        this.logger.error(`\nClaude Code is not installed.`);
        this.showInstallationInstructions(agentName);
        process.exit(1);
      }

      // Create configuration
      const config = {
        inactivityTimeout: parseInt(options.timeout || TIMEOUTS.DEFAULT_INACTIVITY.toString()),
        showSpinner: options.spinner !== false,
        verbose: options.verbose || false,
        planMode: options.planMode || false,
        interactive: !options.message // Interactive if no message provided
      };

      // Show Plan Mode indicator if enabled
      if (config.planMode) {
        this.logger.separator();
        this.logger.info('📋 Plan Mode enabled - Claude will research and plan without executing changes');
        this.logger.separator();
      }

      // Create and start Maestro with clear wrapper indication
      this.logger.separator();
      this.logger.maestro('AgentMaestro - Wrapper for Claude Code');
      this.logger.info('🚀 Starting Claude Code session...');
      this.logger.separator();

      const maestro = Maestro.create(config);
      await maestro.start();

      // Non-interactive mode: send single message and exit
      if (options.message) {
        this.logger.info(`\nSending message: ${options.message}\n`);
        const result = await maestro.sendMessage(options.message);

        // Display result
        this.logger.separator();
        this.logger.info(`Agent Response (${result.agent}):`);
        this.logger.separator();
        console.log(result.content || '(no output)');
        this.logger.separator();

        // Display exit code if non-zero
        if (result.exitCode !== 0) {
          this.logger.warn(`Exit code: ${result.exitCode}`);
        }

        // Stop maestro
        await maestro.stop();
        this.logger.success('\n✓ Completed\n');
      } else {
        // Interactive mode: start session
        const session = new InteractiveSession(maestro);
        await session.start();
      }

    } catch (error) {
      this.logger.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  /**
   * Check if an agent is available on the system
   */
  private static async checkAvailability(agentName: string): Promise<boolean> {
    const repository = new AgentRepository();

    try {
      const agent = repository.findByName(agentName);

      // Check if command exists by trying to spawn it
      const { spawn } = await import('child_process');
      return new Promise((resolve) => {
        const process = spawn(agent.command, ['--version'], {
          stdio: 'ignore'
        });

        process.on('error', () => resolve(false));
        process.on('exit', (code) => resolve(code === 0 || code === null));

        // Timeout after 2 seconds
        setTimeout(() => {
          process.kill();
          resolve(false);
        }, TIMEOUTS.COMMAND_AVAILABILITY_CHECK);
      });
    } catch {
      return false;
    }
  }

  /**
   * Show installation instructions for a missing agent
   */
  private static showInstallationInstructions(agentName: string): void {
    const repository = new AgentRepository();

    try {
      const agent = repository.findByName(agentName);

      this.logger.separator();
      this.logger.info('Installation Instructions:');
      this.logger.info(`\nPackage: ${agent.packageName || 'N/A'}`);

      if (agent.packageName) {
        this.logger.info(`Install: npm install -g ${agent.packageName}`);
      }

      this.logger.info(`\nCommand: ${agent.command}`);

      if (agent.requiresAuth) {
        this.logger.warn(`\nAuthentication: ${agent.authType || 'Required'}`);
      }

      this.logger.separator();
    } catch {
      this.logger.warn(`\nUse "maestro info ${agentName}" for more details.`);
    }
  }
}
