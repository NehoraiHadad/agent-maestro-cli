/**
 * Interactive Session - orchestrates REPL-style user interaction
 * Delegates specific responsibilities to specialized components
 */
import * as readline from 'readline';
import type { Maestro } from '../orchestration/Maestro.js';
import { ConsoleLogger } from './logger/ConsoleLogger.js';
import type { LoggingManager } from '../logging/index.js';
import {
  KeypressHandler,
  PromptFormatter,
  MessageProcessor,
  SessionDisplay,
  InputValidator,
  SessionCommands
} from './session/index.js';

/**
 * Main interactive session coordinator
 */
export class InteractiveSession {
  private rl: readline.Interface;
  private maestro: Maestro;
  private logger: ConsoleLogger;
  private loggingManager: LoggingManager;

  // Component delegates
  private keypressHandler: KeypressHandler;
  private promptFormatter: PromptFormatter;
  private messageProcessor: MessageProcessor;
  private sessionDisplay: SessionDisplay;
  private inputValidator: InputValidator;
  private sessionCommands: SessionCommands;

  private isActive: boolean = false;

  constructor(maestro: Maestro) {
    this.maestro = maestro;
    this.logger = new ConsoleLogger();
    this.loggingManager = maestro.getLoggingManager();

    // Initialize components
    this.promptFormatter = new PromptFormatter();
    this.sessionDisplay = new SessionDisplay(this.logger);
    this.inputValidator = new InputValidator();
    this.messageProcessor = new MessageProcessor(this.maestro, this.logger);
    this.sessionCommands = new SessionCommands(this.maestro, this.logger);

    // Initialize readline
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.getPrompt()
    });

    this.keypressHandler = new KeypressHandler(this.maestro, this.rl, this.logger);
  }

  /**
   * Start the interactive session loop
   */
  async start(): Promise<void> {
    this.isActive = true;

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Show welcome message
    this.sessionDisplay.showWelcome();

    // Start prompt
    this.rl.prompt();

    // Setup input handling
    this.setupInputHandling();

    // Setup signal handling
    this.setupSignalHandling();
  }

  /**
   * Setup keyboard shortcuts (Shift+Tab, Ctrl+C, Ctrl+D)
   */
  private setupKeyboardShortcuts(): void {
    this.keypressHandler.setup({
      onPlanModeToggle: () => this.updatePrompt(),
      onInterrupt: () => {}, // Handled by keypress handler
      onEOF: () => this.stop()
    });
  }

  /**
   * Setup input line handling
   */
  private setupInputHandling(): void {
    this.rl.on('line', async (input: string) => {
      const trimmed = input.trim();
      this.loggingManager.debug('InteractiveSession', `Received: "${trimmed.substring(0, 50)}..."`);

      // Check for exit commands
      if (this.inputValidator.isExitCommand(trimmed)) {
        await this.stop();
        return;
      }

      // Skip empty input
      if (this.inputValidator.isEmpty(trimmed)) {
        this.rl.prompt();
        return;
      }

      // Check for session commands (/reset, /session-info, etc.)
      if (this.sessionCommands.isSessionCommand(trimmed)) {
        await this.sessionCommands.execute(trimmed);
        this.rl.prompt();
        return;
      }

      // Process the message
      await this.messageProcessor.process(
        trimmed,
        () => this.rl.pause(),
        () => this.rl.resume()
      );

      // Prompt for next input
      if (this.isActive) {
        this.rl.prompt();
      }
    });
  }

  /**
   * Setup signal handling (Ctrl+C, stream close)
   */
  private setupSignalHandling(): void {
    // Handle Ctrl+C
    this.rl.on('SIGINT', () => {
      console.log('\n');
      this.logger.warn('Interrupted. Type "exit" to quit gracefully.');
      this.rl.prompt();
    });

    // Handle stream end
    this.rl.on('close', async () => {
      if (this.isActive) {
        await this.stop();
      }
    });
  }

  /**
   * Stop the interactive session
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Cleanup keypress handler
    this.keypressHandler.cleanup();

    // Show session summary
    const stats = this.maestro.getStats();
    this.sessionDisplay.showSummary(stats);

    // Cleanup
    await this.maestro.stop();
    this.rl.close();
    process.exit(0);
  }

  /**
   * Get the current prompt based on Plan Mode state
   */
  private getPrompt(): string {
    return this.promptFormatter.getPrompt(this.maestro.isPlanMode());
  }

  /**
   * Update the readline prompt
   */
  private updatePrompt(): void {
    this.rl.setPrompt(this.getPrompt());
  }
}
