import chalk from 'chalk';

/**
 * Logging utilities for Maestro
 */
export class Logger {
  static info(message) {
    console.log(chalk.blue('[Maestro]'), message);
  }

  static success(message) {
    console.log(chalk.green('[Maestro]'), message);
  }

  static error(message) {
    console.error(chalk.red('[Maestro Error]'), message);
  }

  static warn(message) {
    console.warn(chalk.yellow('[Maestro Warning]'), message);
  }

  static delegation(agent, action) {
    console.log(chalk.magenta('[Maestro Delegation]'), `${action} → ${agent}`);
  }
}

