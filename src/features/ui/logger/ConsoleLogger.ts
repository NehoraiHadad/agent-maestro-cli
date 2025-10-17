/**
 * ConsoleLogger.ts
 * Console logging with colors and formatting
 */

import chalk from 'chalk';

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
   * Log maestro-specific message
   */
  maestro(message: string, ...args: unknown[]): void {
    console.log(chalk.magenta.bold('[MAESTRO]'), message, ...args);
  }

  /**
   * Log delegation message
   */
  delegation(agentName: string, message: string, ...args: unknown[]): void {
    const formattedAgent = chalk.cyan.bold(`[${agentName.toUpperCase()}]`);
    console.log(formattedAgent, message, ...args);
  }

  /**
   * Log agent-specific message with custom color
   */
  agent(agentName: string, message: string, color?: string): void {
    const agentLabel = `[${agentName.toUpperCase()}]`;
    const coloredLabel = color && (chalk as any)[color]
      ? (chalk as any)[color].bold(agentLabel)
      : chalk.cyan.bold(agentLabel);

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

    const colorFn = color && (chalk as any)[color] ? (chalk as any)[color] : chalk.white;

    console.log(colorFn(border));
    lines.forEach(line => {
      const padding = ' '.repeat(maxLength - line.length);
      console.log(colorFn(`| ${line}${padding} |`));
    });
    console.log(colorFn(border));
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
}
