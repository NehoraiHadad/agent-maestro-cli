/**
 * List Command
 * Displays all available agents with their installation status
 */

import { Command } from 'commander';
import { AgentRepository } from '../../domain/index.js';
import { ConsoleLogger } from '../../features/ui/index.js';
import type { Agent } from '../../shared/types/index.js';
import chalk from 'chalk';

/**
 * ListCommand - handles listing all available agents
 */
export class ListCommand {
  private static logger = new ConsoleLogger();

  /**
   * Register the list command with the CLI program
   */
  static register(program: Command): void {
    program
      .command('list')
      .description('list all available agents')
      .action(async () => {
        await this.execute();
      });
  }

  /**
   * Execute the list command
   */
  static async execute(): Promise<void> {
    try {
      const repository = new AgentRepository();
      const claude = repository.findByName('claude');

      this.logger.separator();
      this.logger.maestro('AgentMaestro - Wrapper for Claude Code');
      this.logger.separator();
      console.log(); // Empty line

      // Show Claude agent info
      const available = await this.checkAgentAvailability(claude);
      this.formatAgentInfo(claude, available);
      console.log(); // Empty line

      this.logger.separator();
      this.logger.info('💡 Claude Code can delegate to Codex/Gemini via native Subagents');
      this.logger.info('   Simply ask Claude to use the agent you need!');
      console.log(); // Empty line
      this.logger.info('Use "maestro info claude" for detailed information');
      this.logger.separator();

    } catch (error) {
      this.logger.error(`Error listing agents: ${error instanceof Error ? error.message : String(error)}`);
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
   * Format and display agent information
   */
  private static formatAgentInfo(agent: Agent, available: boolean): void {
    // Status indicator
    const status = available
      ? chalk.green('✓ installed')
      : chalk.red('✗ not installed');

    // Display name with status
    console.log(chalk.bold(`${agent.displayName} ${status}`));

    // Description
    console.log(chalk.gray(`  ${agent.description}`));

    // Package info
    if (agent.packageName) {
      console.log(chalk.cyan(`  Package: ${agent.packageName}`));
    }

    // Command
    console.log(chalk.blue(`  Command: ${agent.command}`));

    // Authentication info
    if (agent.requiresAuth && agent.authType) {
      console.log(chalk.yellow(`  Auth: ${agent.authType}`));
    }

    // Installation hint if not available
    if (!available && agent.packageName) {
      console.log(chalk.dim(`  Install: npm install -g ${agent.packageName}`));
    }
  }
}
