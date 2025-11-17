/**
 * Spinner.ts
 * Wraps ora spinner with custom functionality and duration tracking
 */

import ora from 'ora';
import chalk from 'chalk';
import type { SpinnerInstance, ChalkColorMethod } from '../../../shared/types/ui.types.js';

/**
 * Custom spinner wrapper with enhanced functionality
 */
export class Spinner {
  private spinner: SpinnerInstance | null = null;
  private startTime: number | null = null;

  /**
   * Start the spinner with initial text
   * @param text - Initial spinner text
   * @param color - Optional color for the spinner
   */
  start(text: string, color?: string): this {
    this.startTime = Date.now();

    this.spinner = ora({
      text: this.formatText(text, color),
      color: this.getOraColor(color),
      spinner: 'dots'
    }).start();

    return this;
  }

  /**
   * Update the spinner text
   * @param text - New text to display
   * @param color - Optional color for the text
   */
  update(text: string, color?: string): this {
    if (this.spinner) {
      this.spinner.text = this.formatText(text, color);
      if (color) {
        this.spinner.color = this.getOraColor(color);
      }
    }
    return this;
  }

  /**
   * Stop the spinner with success state
   * @param text - Success message
   */
  succeed(text: string): this {
    if (this.spinner) {
      this.spinner.succeed(this.formatWithDuration(text));
      this.cleanup();
    }
    return this;
  }

  /**
   * Stop the spinner with failure state
   * @param text - Failure message
   */
  fail(text: string): this {
    if (this.spinner) {
      this.spinner.fail(this.formatWithDuration(text));
      this.cleanup();
    }
    return this;
  }

  /**
   * Stop the spinner with warning state
   * @param text - Warning message
   */
  warn(text: string): this {
    if (this.spinner) {
      this.spinner.warn(this.formatWithDuration(text));
      this.cleanup();
    }
    return this;
  }

  /**
   * Stop the spinner without any symbol
   */
  stop(): this {
    if (this.spinner) {
      this.spinner.stop();
      this.cleanup();
    }
    return this;
  }

  /**
   * Check if spinner is currently active
   */
  isSpinning(): boolean {
    return this.spinner !== null && this.spinner.isSpinning === true;
  }

  /**
   * Convert color (hex or name) to Ora-compatible color name
   * Ora only supports named colors, not hex
   */
  private getOraColor(color?: string): 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray' {
    if (!color) {
      return 'cyan';
    }

    // If it's a hex color, map to closest named color for Ora spinner
    if (color.startsWith('#')) {
      // Map hex colors to Ora-compatible named colors
      const hexMap: Record<string, 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray'> = {
        '#D97757': 'yellow',  // Claude - coral -> yellow
        '#4285F4': 'blue',     // Gemini - blue
        '#10A37F': 'green',    // Codex - green
        '#9B59B6': 'magenta'   // Maestro - purple -> magenta
      };
      return hexMap[color] || 'cyan';
    }

    // Check if it's a valid Ora color
    const validOraColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray'];
    if (validOraColors.includes(color)) {
      return color as 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray';
    }

    // Default to cyan if invalid
    return 'cyan';
  }

  /**
   * Format text with optional color
   */
  private formatText(text: string, color?: string): string {
    if (!color) {
      return text;
    }

    // Support hex colors (e.g., '#D97757')
    if (color.startsWith('#')) {
      return chalk.hex(color)(text);
    }

    // Support named colors (e.g., 'cyan', 'magenta')
    const validColors: ChalkColorMethod[] = [
      'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey'
    ];

    if (validColors.includes(color as ChalkColorMethod)) {
      const chalkColor = chalk[color as ChalkColorMethod];
      return chalkColor(text);
    }

    return text;
  }

  /**
   * Format text with duration suffix
   */
  private formatWithDuration(text: string): string {
    const duration = this.getDuration();
    return duration ? `${text} ${chalk.gray(`(${duration})`)}` : text;
  }

  /**
   * Get formatted duration string
   */
  private getDuration(): string {
    if (!this.startTime) {
      return '';
    }

    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const ms = elapsed % 1000;

    if (seconds > 0) {
      return `${seconds}.${Math.floor(ms / 100)}s`;
    }
    return `${ms}ms`;
  }

  /**
   * Cleanup internal state
   */
  private cleanup(): void {
    this.startTime = null;
  }
}
