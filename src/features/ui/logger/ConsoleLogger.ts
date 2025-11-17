/**
 * ConsoleLogger.ts
 * Console logging with colors and formatting
 */

import chalk from 'chalk';
import type { ChalkColorMethod } from '../../../shared/types/ui.types.js';

/**
 * Log levels for filtering output
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4
}

/**
 * Console logger with colored output and level filtering
 */
export class ConsoleLogger {
  private level: LogLevel;

  /**
   * Create a new console logger
   * @param level - Minimum log level to display
   */
  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  /**
   * Log debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  }

  /**
   * Log success message
   */
  success(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.SUCCESS) {
      console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(chalk.red(`[ERROR] ${message}`), ...args);
    }
  }

  /**
   * Log maestro wrapper message - indicates Maestro orchestrator action
   */
  maestro(message: string, ...args: unknown[]): void {
    console.log(chalk.magenta.bold('🎭 [Maestro]'), message, ...args);
  }

  /**
   * Log when Maestro starts Claude Code
   */
  startingWrapper(message: string = 'Starting Claude Code wrapper...'): void {
    console.log(chalk.magenta.bold('🎭 [Maestro]'), chalk.gray(message));
  }

  /**
   * Log Claude Code message - the primary agent
   */
  claude(message: string, ...args: unknown[]): void {
    console.log(chalk.hex('#D97757').bold('🤖 [Claude]'), message, ...args);
  }

  /**
   * Log delegation from Claude to another agent
   */
  delegation(fromAgent: string, toAgent: string, task: string = ''): void {
    const arrow = chalk.yellow('→');
    const from = chalk.hex('#D97757').bold(`[${fromAgent}]`);
    const to = chalk.cyan.bold(`[${toAgent}]`);
    const taskMsg = task ? chalk.gray(`: ${task}`) : '';
    console.log(`  ${from} ${arrow} ${to}${taskMsg}`);
  }

  /**
   * Log subagent (Codex/Gemini) working
   */
  subagent(agentName: string, message: string, ...args: unknown[]): void {
    const icon = agentName.toLowerCase() === 'codex' ? '⚡' : '🔍';
    const formattedAgent = chalk.cyan.bold(`${icon} [${agentName}]`);
    console.log(`  ${formattedAgent}`, message, ...args);
  }

  /**
   * Log subagent completion
   */
  subagentComplete(agentName: string, duration?: string): void {
    const durationStr = duration ? chalk.gray(` (${duration})`) : '';
    console.log(`  ${chalk.green('✓')} ${chalk.cyan(`[${agentName}]`)} ${chalk.gray('completed')}${durationStr}`);
  }

  /**
   * Log agent-specific message with custom color
   */
  agent(agentName: string, message: string, color?: string): void {
    const agentLabel = `[${agentName.toUpperCase()}]`;

    let coloredLabel = chalk.cyan.bold(agentLabel);
    if (color) {
      const colorFn = this.getChalkColor(color);
      if (colorFn) {
        coloredLabel = chalk.bold(colorFn(agentLabel));
      }
    }

    console.log(coloredLabel, message);
  }

  /**
   * Print a separator line
   */
  separator(char: string = '=', length: number = 60): void {
    console.log(chalk.gray(char.repeat(length)));
  }

  /**
   * Print a header with separators
   */
  header(text: string): void {
    this.separator();
    console.log(chalk.bold.white(text));
    this.separator();
  }

  /**
   * Print text in a colored box
   */
  box(text: string, color?: string): void {
    const lines = text.split('\n');
    const maxLength = Math.max(...lines.map(line => line.length));
    const border = '+' + '-'.repeat(maxLength + 2) + '+';

    const applyColor = (str: string): string => {
      if (color) {
        const colorFn = this.getChalkColor(color);
        if (colorFn) {
          return colorFn(str);
        }
      }
      return chalk.white(str);
    };

    console.log(applyColor(border));
    lines.forEach(line => {
      const padding = ' '.repeat(maxLength - line.length);
      console.log(applyColor(`| ${line}${padding} |`));
    });
    console.log(applyColor(border));
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Get chalk color function safely
   * @param color - Color name
   * @returns Chalk function or null if invalid
   */
  private getChalkColor(color: string): ((text: string) => string) | null {
    const validColors: ChalkColorMethod[] = [
      'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey'
    ];

    if (validColors.includes(color as ChalkColorMethod)) {
      return chalk[color as ChalkColorMethod];
    }

    return null;
  }
}
