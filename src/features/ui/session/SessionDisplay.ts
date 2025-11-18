/**
 * SessionDisplay - handles display of session information and statistics
 */
import { ConsoleLogger } from '../logger/ConsoleLogger.js';
import type { MaestroStats } from '../../orchestration/Maestro.js';

export class SessionDisplay {
  private logger: ConsoleLogger;

  constructor(logger: ConsoleLogger) {
    this.logger = logger;
  }

  /**
   * Display welcome message at session start
   */
  showWelcome(): void {
    this.logger.separator();
    this.logger.maestro('Interactive Session - Claude Code Wrapper');
    this.logger.separator();
    this.logger.info('🤖 Primary Agent: Claude Code');
    this.logger.info('🔄 Auto-delegation: Enabled (Codex & Gemini)');
    this.logger.info('');
    this.logger.info('💬 Type your messages below');
    this.logger.info('⌨️  Press Shift+Tab to toggle Plan Mode');
    this.logger.info('📋 Commands: /reset, /session-info, /help-session');
    this.logger.info('🚪 Type "exit" or "quit" to end session\n');
    this.logger.separator();
  }

  /**
   * Display session summary at session end
   * @param stats - Session statistics
   */
  showSummary(stats: MaestroStats): void {
    console.log('\n');
    this.logger.separator();
    this.logger.maestro('Session ended');
    this.logger.info(`Total messages: ${stats.totalMessages}`);
    this.logger.info(`Duration: ${this.formatDuration(stats.sessionDuration)}`);
    this.logger.separator();
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
}
