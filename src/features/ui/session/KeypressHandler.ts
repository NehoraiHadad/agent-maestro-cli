/**
 * KeypressHandler - handles keyboard shortcuts in interactive sessions
 */
import * as readline from 'readline';
import type { Maestro } from '../../orchestration/Maestro.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';
import { PromptFormatter } from './PromptFormatter.js';

export interface KeypressCallbacks {
  onPlanModeToggle: (newState: boolean) => void;
  onInterrupt: () => void;
  onEOF: () => void;
}

/**
 * Handles keyboard shortcuts for interactive sessions
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
    process.stdin.on('keypress', (_str: string, key: any) => {
      this.handleKeypress(key, callbacks);
    });

    this.isSetup = true;
  }

  /**
   * Handle individual keypress events
   */
  private handleKeypress(key: any, callbacks: KeypressCallbacks): void {
    if (!key) return;

    // Shift+Tab to toggle Plan Mode
    if (this.isShiftTab(key)) {
      this.handlePlanModeToggle(callbacks.onPlanModeToggle);
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
  private isShiftTab(key: any): boolean {
    return key.name === 'tab' && key.shift && !key.ctrl && !key.meta;
  }

  /**
   * Check if key combination is Ctrl+C
   */
  private isCtrlC(key: any): boolean {
    return key.ctrl && key.name === 'c';
  }

  /**
   * Check if key combination is Ctrl+D
   */
  private isCtrlD(key: any): boolean {
    return key.ctrl && key.name === 'd';
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
   * Cleanup keypress handling
   */
  cleanup(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    this.isSetup = false;
  }
}
