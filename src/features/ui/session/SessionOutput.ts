/**
 * SessionOutput - Handles all output display and message processing
 * Combines display formatting and message processing logic
 */

import chalk from 'chalk';
import type { Maestro } from '../../orchestration/Maestro.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';
import { StatusDisplay } from '../StatusDisplay.js';
import type { MaestroStats } from '../../orchestration/Maestro.js';
import type { LoggingManager } from '../../logging/index.js';
import type { SessionInfo } from '../../../shared/types/ui.types.js';

/**
 * SessionDisplay - handles display of session information and statistics
 */
export class SessionDisplay {
  private logger: ConsoleLogger;
  private statusDisplay: StatusDisplay;

  constructor(logger: ConsoleLogger, statusDisplay?: StatusDisplay) {
    this.logger = logger;
    this.statusDisplay = statusDisplay || new StatusDisplay();
  }

  /**
   * Display welcome message at session start
   * @param maestro - Maestro instance for session info
   */
  showWelcome(maestro?: Maestro): void {
    // If StatusDisplay is enabled and we have maestro instance, use enhanced header
    if (maestro && this.statusDisplay.getConfig().enabled && this.statusDisplay.getConfig().showHeader) {
      const sessionInfo = this.buildSessionInfo(maestro);
      this.statusDisplay.showSessionHeader(sessionInfo);

      // Show additional tips
      this.logger.info('💬 Type your messages below');
      this.logger.info('⌨️  Press Shift+Tab to toggle Plan Mode');
      this.logger.info('📋 Commands: /reset, /session-info, /help-session, /save, /load, /sessions');
      this.logger.info('🚪 Type "exit" or "quit" to end session\n');
      this.statusDisplay.showSeparator();
    } else {
      // Fallback to classic display
      this.logger.separator();
      this.logger.maestro('AgentMaestro - Wrapper for Claude Code');
      this.logger.separator();
      this.logger.info('🤖 Running: Claude Code (native interface)');
      this.logger.info('💡 Tip: Claude can delegate to Codex/Gemini via Subagents');
      this.logger.info('');
      this.logger.info('💬 Type your messages below');
      this.logger.info('⌨️  Press Shift+Tab to toggle Plan Mode');
      this.logger.info('📋 Commands: /reset, /session-info, /help-session, /save, /load, /sessions');
      this.logger.info('🚪 Type "exit" or "quit" to end session\n');
      this.logger.separator();
    }
  }

  /**
   * Display session summary at session end
   * @param stats - Session statistics
   * @param maestro - Optional Maestro instance for enhanced display
   */
  showSummary(stats: MaestroStats, maestro?: Maestro): void {
    console.log('\n');

    // If StatusDisplay is enabled, show enhanced summary
    if (maestro && this.statusDisplay.getConfig().enabled) {
      this.statusDisplay.showStatus({
        type: 'info',
        message: 'Session ended',
        details: `Messages: ${stats.totalMessages} | Duration: ${this.formatDuration(stats.sessionDuration)}`
      });
    } else {
      // Fallback to classic display
      this.logger.separator();
      this.logger.maestro('Session ended');
      this.logger.info(`Total messages: ${stats.totalMessages}`);
      this.logger.info(`Duration: ${this.formatDuration(stats.sessionDuration)}`);
      this.logger.separator();
    }

    this.logger.success('\nGoodbye! 👋\n');
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

  /**
   * Build session info from Maestro instance
   */
  private buildSessionInfo(maestro: Maestro): SessionInfo {
    const stats = maestro.getStats();
    const exportData = maestro.exportSession();

    return {
      sessionId: exportData.sessionId,
      mode: 'Interactive',
      planMode: maestro.isPlanMode(),
      messageCount: stats.totalMessages,
      duration: stats.sessionDuration,
      agentName: 'claude'
    };
  }

  /**
   * Get the StatusDisplay instance
   */
  getStatusDisplay(): StatusDisplay {
    return this.statusDisplay;
  }
}

/**
 * MessageProcessor - handles processing of user messages
 */
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

      // Resume readline for next input
      onResume();

    } catch (error) {
      this.handleError(error);
      // Resume readline even on error
      onResume();
    }
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
