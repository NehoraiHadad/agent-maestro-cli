/**
 * SessionInput - Handles all user input processing
 * Combines input validation, formatting, and keyboard handling
 */

import * as readline from 'readline';
import chalk from 'chalk';
import type { Maestro } from '../../orchestration/Maestro.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';
import type { KeypressEvent } from '../../../shared/types/ui.types.js';

/**
 * InputValidator - validates and checks user input
 */
export class InputValidator {
  private readonly exitCommands = ['exit', 'quit', 'q', 'bye'];

  /**
   * Check if input is an exit command
   * @param input - User input to check
   * @returns True if input is an exit command
   */
  isExitCommand(input: string): boolean {
    return this.exitCommands.includes(input.toLowerCase());
  }

  /**
   * Check if input is empty or whitespace only
   * @param input - User input to check
   * @returns True if input is empty
   */
  isEmpty(input: string): boolean {
    return input.trim().length === 0;
  }
}

/**
 * PromptFormatter - formats CLI prompts based on session state
 */
export class PromptFormatter {
  /**
   * Get formatted prompt based on Plan Mode state
   * @param isPlanMode - Whether Plan Mode is enabled
   * @returns Formatted prompt string
   */
  getPrompt(isPlanMode: boolean): string {
    if (isPlanMode) {
      return chalk.yellow.bold('\n[PLAN] You > ');
    }
    return chalk.cyan.bold('\nYou > ');
  }

  /**
   * Format Plan Mode status change message
   * @param enabled - Whether Plan Mode was enabled or disabled
   * @returns Formatted status message
   */
  formatPlanModeChange(enabled: boolean): string {
    if (enabled) {
      return '📋 Plan Mode enabled - Claude will research and plan without executing';
    }
    return '✓ Plan Mode disabled - Normal execution mode';
  }
}

export interface KeypressCallbacks {
  onPlanModeToggle: (newState: boolean) => void;
  onInterrupt: () => void;
  onEOF: () => void;
  onCommandPalette: () => void;
}

/**
 * KeypressHandler - handles keyboard shortcuts in interactive sessions
 */
export class KeypressHandler {
  private maestro: Maestro;
  private logger: ConsoleLogger;
  private promptFormatter: PromptFormatter;
  private rl: readline.Interface;
  private isSetup: boolean = false;

  constructor(
    maestro: Maestro,
    rl: readline.Interface,
    logger: ConsoleLogger
  ) {
    this.maestro = maestro;
    this.rl = rl;
    this.logger = logger;
    this.promptFormatter = new PromptFormatter();
  }

  /**
   * Setup keypress event handling
   * @param callbacks - Callbacks for different key events
   */
  setup(callbacks: KeypressCallbacks): void {
    if (this.isSetup) {
      return;
    }

    // Enable keypress events
    readline.emitKeypressEvents(process.stdin);

    // Set raw mode to capture individual key presses
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    // Listen for keypress events
    process.stdin.on('keypress', (_str: string, key: KeypressEvent) => {
      this.handleKeypress(key, callbacks);
    });

    this.isSetup = true;
  }

  /**
   * Handle individual keypress events
   */
  private handleKeypress(key: KeypressEvent, callbacks: KeypressCallbacks): void {
    if (!key) return;

    // Shift+Tab to toggle Plan Mode
    if (this.isShiftTab(key)) {
      this.handlePlanModeToggle(callbacks.onPlanModeToggle);
      return;
    }

    // Ctrl+P to open Command Palette
    if (this.isCtrlP(key)) {
      this.handleCommandPalette(callbacks.onCommandPalette);
      return;
    }

    // Ctrl+C for graceful interrupt
    if (this.isCtrlC(key)) {
      this.handleInterrupt(callbacks.onInterrupt);
      return;
    }

    // Ctrl+D for EOF
    if (this.isCtrlD(key)) {
      this.handleEOF(callbacks.onEOF);
      return;
    }
  }

  /**
   * Check if key combination is Shift+Tab
   */
  private isShiftTab(key: KeypressEvent): boolean {
    return key.name === 'tab' && key.shift === true && key.ctrl !== true && key.meta !== true;
  }

  /**
   * Check if key combination is Ctrl+C
   */
  private isCtrlC(key: KeypressEvent): boolean {
    return key.ctrl === true && key.name === 'c';
  }

  /**
   * Check if key combination is Ctrl+D
   */
  private isCtrlD(key: KeypressEvent): boolean {
    return key.ctrl === true && key.name === 'd';
  }

  /**
   * Check if key combination is Ctrl+P
   */
  private isCtrlP(key: KeypressEvent): boolean {
    return key.ctrl === true && key.name === 'p';
  }

  /**
   * Handle Plan Mode toggle
   */
  private handlePlanModeToggle(callback: (newState: boolean) => void): void {
    const newState = this.maestro.togglePlanMode();

    // Show visual feedback
    console.log(''); // New line
    this.logger.info(this.promptFormatter.formatPlanModeChange(newState));

    // Notify callback
    callback(newState);

    // Re-display the prompt
    this.rl.prompt(true);
  }

  /**
   * Handle Ctrl+C interrupt
   */
  private handleInterrupt(callback: () => void): void {
    console.log('\n');
    this.logger.warn('Interrupted. Type "exit" to quit gracefully or press Ctrl+C again to force quit.');
    callback();
    this.rl.prompt();
  }

  /**
   * Handle Ctrl+D (EOF)
   */
  private handleEOF(callback: () => void): void {
    console.log('\n');
    callback();
  }

  /**
   * Handle Ctrl+P (Command Palette)
   */
  private handleCommandPalette(callback: () => void): void {
    callback();
  }

  /**
   * Cleanup keypress handling
   */
  cleanup(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    this.isSetup = false;
  }
}
