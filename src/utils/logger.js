/**
 * Logging utilities with colors and formatting
 */

import chalk from 'chalk';

export class Logger {
  static levels = {
    DEBUG: 0,
    INFO: 1,
    SUCCESS: 2,
    WARN: 3,
    ERROR: 4
  };

  static currentLevel = Logger.levels.INFO;

  static setLevel(level) {
    Logger.currentLevel = level;
  }

  static debug(message, ...args) {
    if (Logger.currentLevel <= Logger.levels.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  static info(message, ...args) {
    if (Logger.currentLevel <= Logger.levels.INFO) {
      console.log(chalk.blue(`ℹ ${message}`), ...args);
    }
  }

  static success(message, ...args) {
    if (Logger.currentLevel <= Logger.levels.SUCCESS) {
      console.log(chalk.green(`✓ ${message}`), ...args);
    }
  }

  static warn(message, ...args) {
    if (Logger.currentLevel <= Logger.levels.WARN) {
      console.log(chalk.yellow(`⚠ ${message}`), ...args);
    }
  }

  static error(message, ...args) {
    if (Logger.currentLevel <= Logger.levels.ERROR) {
      console.error(chalk.red(`✗ ${message}`), ...args);
    }
  }

  static maestro(message, ...args) {
    console.log(chalk.magenta.bold(`🎭 [Maestro] ${message}`), ...args);
  }

  static delegation(agentName, message, ...args) {
    console.log(chalk.cyan(`  ↳ [${agentName}] ${message}`), ...args);
  }

  static agent(agentName, message, color = 'white') {
    console.log(chalk[color](`[${agentName}] ${message}`));
  }

  static separator(char = '─', length = 60) {
    console.log(chalk.gray(char.repeat(length)));
  }

  static header(text) {
    console.log('');
    Logger.separator('═');
    console.log(chalk.bold.white(`  ${text}`));
    Logger.separator('═');
    console.log('');
  }

  static box(text, color = 'white') {
    const lines = text.split('\n');
    const maxLength = Math.max(...lines.map(l => l.length));

    console.log(chalk[color]('┌' + '─'.repeat(maxLength + 2) + '┐'));
    lines.forEach(line => {
      console.log(chalk[color]('│ ' + line.padEnd(maxLength) + ' │'));
    });
    console.log(chalk[color]('└' + '─'.repeat(maxLength + 2) + '┘'));
  }
}

export default Logger;
