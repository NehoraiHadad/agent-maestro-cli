/**
 * Interactive Session - handles REPL-style user interaction
 */
import * as readline from 'readline';
import chalk from 'chalk';
import type { Maestro } from '../orchestration/Maestro.js';
import { ConsoleLogger } from './logger/ConsoleLogger.js';

export class InteractiveSession {
  private rl: readline.Interface;
  private maestro: Maestro;
  private logger: ConsoleLogger;
  private isActive: boolean = false;

  constructor(maestro: Maestro) {
    this.maestro = maestro;
    this.logger = new ConsoleLogger();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan.bold('\nYou > ')
    });
  }

  /**
   * Start the interactive session loop
   */
  async start(): Promise<void> {
    this.isActive = true;

    // Show welcome message
    this.logger.separator();
    this.logger.success('🎭 AgentMaestro session started!');
    this.logger.info('Type your messages below. Type "exit" or "quit" to end the session.\n');
    this.logger.separator();

    // Prompt for first input
    this.rl.prompt();

    // Setup line handler
    this.rl.on('line', async (input: string) => {
      const trimmed = input.trim();

      // Check for exit commands
      if (this.isExitCommand(trimmed)) {
        await this.stop();
        return;
      }

      // Skip empty input
      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      // Process the message
      await this.processMessage(trimmed);

      // Prompt for next input
      if (this.isActive) {
        this.rl.prompt();
      }
    });

    // Handle Ctrl+C
    this.rl.on('SIGINT', async () => {
      console.log('\n');
      this.logger.warn('Interrupted. Type "exit" to quit gracefully.');
      this.rl.prompt();
    });

    // Handle stream end
    this.rl.on('close', async () => {
      if (this.isActive) {
        await this.stop();
      }
    });
  }

  /**
   * Process a user message
   */
  private async processMessage(message: string): Promise<void> {
    try {
      // Send message to Maestro
      const result = await this.maestro.sendMessage(message);

      // Display response
      console.log('\n' + chalk.magenta.bold(`${result.agent} > `));
      console.log(result.content);

      // Show delegations if any
      if (result.delegations && result.delegations.length > 0) {
        console.log('\n' + chalk.cyan('━'.repeat(60)));
        console.log(chalk.cyan(`✨ ${result.delegations.length} delegation(s) executed`));
        console.log(chalk.cyan('━'.repeat(60)));
      }

    } catch (error) {
      this.logger.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);

      if (error instanceof Error && error.stack) {
        this.logger.debug(error.stack);
      }
    }
  }

  /**
   * Stop the interactive session
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Show session summary
    const stats = this.maestro.getStats();

    console.log('\n');
    this.logger.separator();
    this.logger.maestro('Session ended');
    this.logger.info(`Total messages: ${stats.totalMessages}`);
    this.logger.info(`Delegations: ${stats.totalDelegations}`);
    this.logger.info(`Duration: ${this.formatDuration(stats.sessionDuration)}`);
    this.logger.separator();
    this.logger.success('\nGoodbye! 👋\n');

    // Cleanup
    await this.maestro.stop();
    this.rl.close();
    process.exit(0);
  }

  /**
   * Check if input is an exit command
   */
  private isExitCommand(input: string): boolean {
    const exitCommands = ['exit', 'quit', 'q', 'bye'];
    return exitCommands.includes(input.toLowerCase());
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
