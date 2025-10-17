/**
 * Start Command
 * Initiates the AgentMaestro orchestration with a selected agent
 */

import { Command } from 'commander';
import { Maestro } from '../../features/orchestration/index.js';
import { AgentRepository } from '../../domain/index.js';
import { InteractiveMenu } from '../../features/ui/index.js';
import { ConsoleLogger } from '../../features/ui/index.js';
import type { AgentName } from '../../shared/types/index.js';
import { AgentNotFoundError } from '../../shared/errors/index.js';

interface StartCommandOptions {
  agent?: string;
  verbose?: boolean;
  spinner?: boolean;
  timeout?: string;
  maxDepth?: string;
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
      .option('-a, --agent <name>', 'specify primary agent (claude, gemini, codex)')
      .option('-v, --verbose', 'enable verbose logging')
      .option('--no-spinner', 'disable loading spinners')
      .option('--timeout <ms>', 'delegation timeout in milliseconds', '60000')
      .option('--max-depth <n>', 'max delegation depth', '3')
      .action(async (options: StartCommandOptions) => {
        await this.execute(options);
      });
  }

  /**
   * Execute the start command
   */
  static async execute(options: StartCommandOptions): Promise<void> {
    try {
      // Select agent (from option or interactive menu)
      const agentName = options.agent
        ? options.agent
        : await this.selectAgent();

      // Check agent availability
      const available = await this.checkAvailability(agentName);
      if (!available) {
        this.logger.error(`\nAgent '${agentName}' is not installed.`);
        this.showInstallationInstructions(agentName);
        process.exit(1);
      }

      // Create configuration
      const config = {
        inactivityTimeout: parseInt(options.timeout || '60000'),
        maxDelegationDepth: parseInt(options.maxDepth || '3'),
        showSpinner: options.spinner !== false,
        verbose: options.verbose || false
      };

      // Create and start Maestro
      this.logger.header(`Starting AgentMaestro with ${agentName}`);
      const maestro = new Maestro(agentName as AgentName, config);
      await maestro.start();

    } catch (error) {
      if (error instanceof AgentNotFoundError) {
        this.logger.error(`\n${error.message}`);
        this.logger.info('\nUse "maestro list" to see available agents.');
      } else {
        this.logger.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
      }
      process.exit(1);
    }
  }

  /**
   * Prompt user to select an agent interactively
   */
  private static async selectAgent(): Promise<string> {
    const repository = new AgentRepository();
    const agents = repository.findAll();
    const menu = new InteractiveMenu();

    this.logger.info('Select an agent to start orchestration:\n');
    return await menu.selectAgent(agents);
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
        }, 2000);
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
