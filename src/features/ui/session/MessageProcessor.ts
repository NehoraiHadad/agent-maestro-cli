/**
 * MessageProcessor - handles processing of user messages
 */
import chalk from 'chalk';
import type { Maestro } from '../../orchestration/Maestro.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';
import type { LoggingManager } from '../../logging/index.js';

export class MessageProcessor {
  private maestro: Maestro;
  private logger: ConsoleLogger;
  private loggingManager: LoggingManager;

  constructor(maestro: Maestro, logger: ConsoleLogger) {
    this.maestro = maestro;
    this.logger = logger;
    this.loggingManager = maestro.getLoggingManager();
  }

  /**
   * Process a user message and send it to the agent
   * @param message - User message to process
   * @param onPause - Callback to pause readline
   * @param onResume - Callback to resume readline
   */
  async process(
    message: string,
    onPause: () => void,
    onResume: () => void
  ): Promise<void> {
    try {
      // Pause readline to prevent conflicts with agent output
      onPause();

      // Send message to Maestro
      const result = await this.maestro.sendMessage(message);

      // Display response
      console.log('\n' + chalk.magenta.bold(`${result.agent} > `));
      console.log(result.content);

      // Show delegations if any
      if (result.delegations && result.delegations.length > 0) {
        this.displayDelegations(result.delegations.length);
      }

      // Resume readline for next input
      onResume();

    } catch (error) {
      this.handleError(error);
      // Resume readline even on error
      onResume();
    }
  }

  /**
   * Display delegation information
   */
  private displayDelegations(count: number): void {
    console.log('\n' + chalk.cyan('━'.repeat(60)));
    console.log(chalk.cyan(`✨ ${count} delegation(s) executed`));
    console.log(chalk.cyan('━'.repeat(60)));
  }

  /**
   * Handle processing errors
   */
  private handleError(error: unknown): void {
    const errorMsg = error instanceof Error ? error.message : String(error);
    this.logger.error(`\n❌ Error: ${errorMsg}`);

    // Log error with stack trace
    if (error instanceof Error && error.stack) {
      this.logger.debug(error.stack);
      this.loggingManager.error('MessageProcessor', 'Message processing failed', {
        error: errorMsg,
        stack: error.stack
      });
    } else {
      this.loggingManager.error('MessageProcessor', 'Message processing failed', {
        error: errorMsg
      });
    }
  }
}
