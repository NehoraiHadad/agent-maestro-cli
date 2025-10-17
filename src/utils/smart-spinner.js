/**
 * Smart spinner utility for long-running operations
 */

import ora from 'ora';
import chalk from 'chalk';

export class SmartSpinner {
  constructor() {
    this.spinner = null;
    this.startTime = null;
  }

  start(text, color = 'cyan') {
    this.startTime = Date.now();
    this.spinner = ora({
      text: chalk[color](text),
      color: color
    }).start();
    return this;
  }

  update(text, color) {
    if (this.spinner) {
      this.spinner.text = color ? chalk[color](text) : text;
    }
    return this;
  }

  succeed(text) {
    if (this.spinner) {
      const duration = this.getDuration();
      this.spinner.succeed(text ? `${text} ${chalk.gray(`(${duration})`)}` : undefined);
      this.spinner = null;
    }
    return this;
  }

  fail(text) {
    if (this.spinner) {
      const duration = this.getDuration();
      this.spinner.fail(text ? `${text} ${chalk.gray(`(${duration})`)}` : undefined);
      this.spinner = null;
    }
    return this;
  }

  warn(text) {
    if (this.spinner) {
      const duration = this.getDuration();
      this.spinner.warn(text ? `${text} ${chalk.gray(`(${duration})`)}` : undefined);
      this.spinner = null;
    }
    return this;
  }

  info(text) {
    if (this.spinner) {
      const duration = this.getDuration();
      this.spinner.info(text ? `${text} ${chalk.gray(`(${duration})`)}` : undefined);
      this.spinner = null;
    }
    return this;
  }

  stop() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
    return this;
  }

  getDuration() {
    if (!this.startTime) return '0ms';
    const ms = Date.now() - this.startTime;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
}

export default SmartSpinner;
