/**
 * Info Command
 * Displays detailed information about a specific agent
 */

import { Command } from 'commander';
import { AgentRepository } from '../../domain/index.js';
import { ConsoleLogger } from '../../features/ui/index.js';
import { AgentNotFoundError } from '../../shared/errors/index.js';
import type { Agent } from '../../shared/types/index.js';
import chalk from 'chalk';

/**
 * InfoCommand - handles displaying detailed agent information
 */
export class InfoCommand {
  private static logger = new ConsoleLogger();

  /**
   * Register the info command with the CLI program
   */
  static register(program: Command): void {
    program
      .command('info <agent>')
      .description('show information about a specific agent')
      .action(async (agentName: string) => {
        await this.execute(agentName);
      });
  }

  /**
   * Execute the info command
   */
  static async execute(agentName: string): Promise<void> {
    try {
      const repository = new AgentRepository();
      const agent = repository.findByName(agentName);

      // Check availability
      const available = await this.checkAgentAvailability(agent);

      // Display information
      this.displayAgentInfo(agent, available);

    } catch (error) {
      if (error instanceof AgentNotFoundError) {
        this.logger.error(`\nAgent '${agentName}' not found.`);
        this.logger.info('\nUse "maestro list" to see available agents.');
      } else {
        this.logger.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
      }
      process.exit(1);
    }
  }

  /**
   * Check if an agent is available on the system
   */
  private static async checkAgentAvailability(agent: Agent): Promise<boolean> {
    try {
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
   * Display detailed agent information
   */
  private static displayAgentInfo(agent: Agent, available: boolean): void {
    this.logger.separator('=', 60);
    console.log(chalk.bold.cyan(`🎭 ${agent.displayName}`));
    this.logger.separator('=', 60);
    console.log();

    // Description
    console.log(chalk.bold('Description:'));
    console.log(`  ${agent.description}`);
    console.log();

    // Status
    console.log(chalk.bold('Status:'));
    if (available) {
      console.log(chalk.green('  ✓ Installed and available'));
    } else {
      console.log(chalk.red('  ✗ Not installed'));
    }
    console.log();

    // Package information
    if (agent.packageName) {
      console.log(chalk.bold('Package:'));
      console.log(`  ${agent.packageName}`);
      console.log();
    }

    // Command
    console.log(chalk.bold('Command:'));
    console.log(chalk.blue(`  ${agent.command}`));
    console.log();

    // Capabilities
    if (agent.capabilities && agent.capabilities.length > 0) {
      console.log(chalk.bold('Capabilities:'));
      agent.capabilities.forEach(capability => {
        console.log(chalk.cyan(`  • ${capability}`));
      });
      console.log();
    }

    // Authentication
    if (agent.requiresAuth) {
      console.log(chalk.bold('Authentication:'));
      console.log(chalk.yellow(`  ${agent.authType || 'Required'}`));
      console.log();
    }

    // Installation instructions (if not available)
    if (!available) {
      this.logger.separator('-', 60);
      console.log(chalk.bold.yellow('Installation Instructions:'));
      console.log();

      if (agent.packageName) {
        console.log(chalk.cyan('  npm install -g ' + agent.packageName));
        console.log();
      }

      if (agent.requiresAuth && agent.authType) {
        console.log(chalk.yellow(`  Note: Requires ${agent.authType}`));
        console.log();
      }
    }

    this.logger.separator('=', 60);
  }
}
