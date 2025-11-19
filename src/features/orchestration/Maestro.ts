/**
 * Maestro.ts
 * Simplified orchestrator - coordinates agent execution with live subagent detection
 */

import { Agent } from '../../domain/entities/index.js';
import { AgentRepository } from '../../domain/index.js';
import { PTYManager } from '../execution/pty/index.js';
import { OutputFormatter } from '../output/index.js';
import { Spinner, StatusUpdater } from '../ui/index.js';
import type { AgentExecutionResult } from '../../shared/types/index.js';
import { ConfigManager, MaestroConfig } from './ConfigManager.js';
import { SessionManager } from './SessionManager.js';
import { LoggingManager } from '../logging/index.js';
import { SessionIdExtractor } from './SessionIdExtractor.js';
import { InputValidator } from '../../shared/utils/InputValidator.js';
import {
  MaestroError,
  AgentError
} from '../../shared/errors/index.js';
import { MiddlewareManager } from '../middleware/MiddlewareManager.js';
import type { Middleware, MiddlewareContext } from '../middleware/types.js';
import { SmartContextInjector } from '../context/index.js';

export interface MaestroStats {
  totalMessages: number;
  sessionDuration: number;
  userMessages: number;
  assistantMessages: number;
  delegationMessages: number;
  startTime: Date;
}

/**
 * Main orchestrator coordinating agent execution
 * Always uses Claude as the primary agent
 */
export class Maestro {
  private primaryAgent: Agent;
  private config: ConfigManager;
  private ptyManager: PTYManager;
  private outputFormatter: OutputFormatter;
  private agentRepository: AgentRepository;
  private sessionManager: SessionManager;
  private statusUpdater: StatusUpdater;
  private loggingManager: LoggingManager;
  private sessionIdExtractor: SessionIdExtractor;
  private middlewareManager: MiddlewareManager;
  private spinner: Spinner | null = null;
  private isRunning: boolean = false;

  /**
   * Create a new Maestro orchestrator
   * @param config - Configuration manager or partial config object
   * @param ptyManager - PTY manager (optional, will create if not provided)
   * @param sessionManager - Session manager (optional, will create if not provided)
   * @param loggingManager - Logging manager (optional, will create if not provided)
   * @param agentRepository - Agent repository (optional, will create if not provided)
   */
  constructor(
    config: ConfigManager | Partial<MaestroConfig>,
    ptyManager?: PTYManager,
    sessionManager?: SessionManager,
    loggingManager?: LoggingManager,
    agentRepository?: AgentRepository
  ) {
    // Handle config as ConfigManager or plain object
    this.config = config instanceof ConfigManager
      ? config
      : new ConfigManager(config);

    // Use injected dependencies or create new ones
    this.agentRepository = agentRepository ?? new AgentRepository();
    this.primaryAgent = this.agentRepository.findByName('claude');

    this.ptyManager = ptyManager ?? new PTYManager();
    this.sessionManager = sessionManager ?? new SessionManager();

    // Initialize logging manager
    this.loggingManager = loggingManager ?? new LoggingManager({
      enableFileLogging: this.config.get('enableFileLogging'),
      logLevel: this.config.get('logLevel'),
      logDirectory: this.config.get('logDirectory'),
      logRotation: this.config.get('logRotation'),
      maxLogFiles: this.config.get('maxLogFiles'),
      maxLogSizeBytes: this.config.get('maxLogSizeBytes')
    });

    this.outputFormatter = new OutputFormatter();
    this.statusUpdater = new StatusUpdater();
    this.sessionIdExtractor = new SessionIdExtractor();
    this.middlewareManager = new MiddlewareManager({
      continueOnError: true,
      trackPerformance: true,
    });

    // Initialize context injection middleware if enabled
    this.initializeContextInjection();
  }

  /**
   * Static factory method for convenient creation
   * @param config - Partial configuration
   * @returns New Maestro instance with default dependencies
   */
  static create(config?: Partial<MaestroConfig>): Maestro {
    return new Maestro(config ?? {});
  }

  /**
   * Start the orchestrator and initialize all subsystems
   *
   * @throws {Error} If orchestrator is already running
   *
   * @example
   * ```typescript
   * const maestro = Maestro.create({ verbose: true });
   * await maestro.start();
   * ```
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Maestro is already running');
    }

    this.isRunning = true;

    // Initialize logging
    await this.loggingManager.initialize();
    this.loggingManager.logSession('started', {
      primaryAgent: this.primaryAgent.name,
      config: this.config.getAll()
    });

    // Initialize spinner if enabled
    if (this.config.get('showSpinner')) {
      this.spinner = new Spinner();
      this.statusUpdater.setSpinner(this.spinner);
    }

    this.loggingManager.debug('Maestro', 'Orchestrator started successfully');
  }

  /**
   * Send a message to the primary agent and execute it
   *
   * @param message - User's message to send to the agent
   * @returns Promise resolving to agent execution result with content and metadata
   *
   * @throws {Error} If Maestro is not running (call start() first)
   * @throws {PTYSpawnError} If process spawn fails
   * @throws {AgentExecutionError} If agent execution fails
   *
   * @example
   * ```typescript
   * const result = await maestro.sendMessage("Explain this codebase");
   * console.log(result.content);
   * console.log(`Exit code: ${result.exitCode}`);
   * ```
   */
  async sendMessage(message: string): Promise<AgentExecutionResult> {
    if (!this.isRunning) {
      throw new Error('Maestro is not running. Call start() first.');
    }

    // Validate input message
    const validationResult = InputValidator.validateMessage(message, {
      maxLength: 100000,
      minLength: 1,
    });

    if (!validationResult.isValid) {
      const errorMessage = `Invalid input: ${validationResult.errors.join(', ')}`;
      this.loggingManager.error('Maestro', errorMessage);
      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      for (const warning of validationResult.warnings) {
        this.loggingManager.warn('Maestro', `Input validation warning: ${warning}`);
      }
    }

    try {
      // Log user message
      this.loggingManager.logUserMessage(message);

      // Add user message to session
      this.sessionManager.addUserMessage(message);

      // Create middleware context
      const cliSession = this.sessionManager.getCliSession(this.primaryAgent.name);
      const middlewareContext: MiddlewareContext = {
        agent: this.primaryAgent.name,
        sessionId: cliSession?.sessionId,
        timestamp: Date.now(),
        metadata: {},
      };

      // Run before middleware hooks
      const processedMessage = await this.middlewareManager.runBefore(
        message,
        middlewareContext
      );

      // Execute primary agent with processed message
      let result = await this.executePrimaryAgent(processedMessage);

      // Run after middleware hooks
      result = await this.middlewareManager.runAfter(result, middlewareContext);

      return result;
    } catch (error) {
      // Enrich and re-throw
      const enrichedError = this.enrichError(error, {
        agent: this.primaryAgent.name,
        operation: 'execution'
      });

      this.loggingManager.error(
        'Maestro',
        `Execution failed: ${enrichedError.message}`,
        enrichedError instanceof MaestroError || enrichedError instanceof AgentError
          ? (enrichedError as MaestroError | AgentError).context
          : {}
      );

      this.logDetailedError(enrichedError, 'sendMessage');

      throw enrichedError;
    }
  }

  /**
   * Stop the orchestrator and cleanup all resources
   * Performs graceful shutdown of PTY processes and closes logging
   *
   * @example
   * ```typescript
   * await maestro.stop();
   * ```
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    this.loggingManager.debug('Maestro', 'Stopping orchestrator');

    // Stop spinner
    if (this.spinner) {
      this.spinner.stop();
    }

    // Cleanup subsystems - gracefully kill all PTY processes
    await this.ptyManager.killAll();

    // Close logging (this will log session end)
    await this.loggingManager.close();
  }

  /**
   * Get all available agents
   * @returns List of available agents
   */
  getAvailableAgents(): Agent[] {
    return this.agentRepository.findAll();
  }

  /**
   * Get orchestration statistics
   * @returns Statistics about the current session
   */
  getStats(): MaestroStats {
    const summary = this.sessionManager.getSummary();

    return {
      totalMessages: summary.messageCount,
      sessionDuration: summary.duration,
      userMessages: summary.userMessages,
      assistantMessages: summary.assistantMessages,
      delegationMessages: summary.delegationMessages,
      startTime: summary.startTime
    };
  }

  /**
   * Export current session
   * @returns Session export data
   */
  exportSession() {
    return this.sessionManager.export();
  }

  /**
   * Get logging manager for external access
   * @returns The logging manager instance
   */
  getLoggingManager(): LoggingManager {
    return this.loggingManager;
  }

  /**
   * Get the configuration manager
   * @returns Configuration manager instance
   */
  getConfigManager(): ConfigManager {
    return this.config;
  }


  /**
   * Enrich error with execution context
   * @param error - Original error
   * @param context - Additional context
   * @returns Enriched error
   */
  private enrichError(
    error: unknown,
    context: {
      agent?: string;
      sessionId?: string;
      executionId?: string;
      operation?: string;
    }
  ): Error {
    // If it's already one of our errors, return as-is
    if (error instanceof MaestroError || error instanceof AgentError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    let enrichedError: Error;

    // Determine error type based on context
    if (context.agent) {
      // Agent-related error
      enrichedError = new AgentError(
        context.agent,
        message,
        'AGENT_ERROR',
        undefined,
        { ...context }
      );
    } else {
      // General maestro error
      enrichedError = new MaestroError(
        message,
        'MAESTRO_ERROR',
        { ...context }
      );
    }

    // Preserve stack trace
    if (stack) {
      enrichedError.stack = stack;
    }

    return enrichedError;
  }

  /**
   * Log error with full context for debugging
   * @param error - Error to log
   * @param operation - Operation that failed
   */
  private logDetailedError(error: Error, operation: string): void {
    const errorInfo: Record<string, unknown> = {
      operation,
      message: error.message,
      name: error.name,
      stack: error.stack,
    };

    if (error instanceof AgentError) {
      errorInfo.code = error.code;
      errorInfo.agentName = error.agentName;
      errorInfo.exitCode = error.exitCode;
      errorInfo.context = error.context;
    } else if (error instanceof MaestroError) {
      errorInfo.code = error.code;
      errorInfo.context = error.context;
    }

    this.loggingManager.error('Maestro', 'Detailed error information:', errorInfo);
  }

  /**
   * Execute the primary agent with streaming
   */
  private async executePrimaryAgent(message: string): Promise<AgentExecutionResult> {
    const processId = `maestro-${this.primaryAgent.name}-${Date.now()}`;
    let output = '';
    let exitCode = 0;

    // Log agent execution start
    this.loggingManager.logAgentExecution(this.primaryAgent.name, 'started', {
      processId,
      messageLength: message.length
    });

    // Start spinner
    if (this.spinner) {
      this.spinner.start(`🤖 Claude Code is processing...`, this.primaryAgent.color);
    }

    return new Promise<AgentExecutionResult>((resolve, reject) => {
      try {
        // Check if we should use --continue flag:
        // ONLY in interactive mode AND after the first message (when session is active)
        // NON-interactive mode (--message flag): Each call is independent, no continuation
        const isInteractive = this.config.get('interactive');
        const cliSession = this.sessionManager.getCliSession(this.primaryAgent.name);

        // Continue session ONLY if:
        // 1. We're in interactive mode (not using -m flag)
        // 2. AND we have an active session (not the first message)
        const shouldContinueSession = isInteractive && (cliSession?.isActive ?? false);

        // Prefer using explicit Session ID when available for better reliability
        // This ensures we always continue the SAME conversation, even if user
        // opened other Claude sessions in different terminals
        const sessionId = cliSession?.sessionId;
        const useSessionId = shouldContinueSession && !!sessionId;

        // Debug logging
        this.loggingManager.debug('Maestro', `Interactive mode: ${isInteractive}`);
        this.loggingManager.debug('Maestro', `CLI session active: ${cliSession?.isActive ?? false}`);
        this.loggingManager.debug('Maestro', `Should continue session: ${shouldContinueSession}`);
        this.loggingManager.debug('Maestro', `Session ID: ${sessionId || 'none'}`);
        this.loggingManager.debug('Maestro', `Using --resume with ID: ${useSessionId}`);

        // Get execution arguments with streaming, continuation, and plan mode support
        // NO delegation prompt - Claude Code Skills/Subagents handle delegation
        // Prefer --resume <sessionId> over --continue for reliability
        const args = this.primaryAgent.getExecutionArgs(message, {
          stream: true,
          continueSession: shouldContinueSession,
          sessionId: useSessionId ? sessionId : undefined, // Only pass if we want to use it
          planMode: this.config.get('planMode')
        });

        // Debug logging
        this.loggingManager.debug('Maestro', `Command args: ${this.primaryAgent.command} ${args.join(' ')}`);

        // Activate session for next time (if this is first interaction in interactive mode)
        // This ensures the NEXT message will use --continue
        if (isInteractive && !shouldContinueSession) {
          this.sessionManager.activateCliSession(this.primaryAgent.name);
        }

        // Spawn PTY process
        this.ptyManager.spawn(processId, this.primaryAgent.command, args);

        // Setup event handlers
        this.setupEventHandlers(processId, (data) => {
          output += data;
        });

        // Handle exit
        this.ptyManager.onExit(processId, async (exitInfo) => {
          exitCode = exitInfo.exitCode;

          try {
            // Try extracting Session ID one final time from complete output
            const currentSession = this.sessionManager.getCliSession(this.primaryAgent.name);
            if (!currentSession?.sessionId) {
              const extractedSessionId = this.sessionIdExtractor.extract(output);

              if (extractedSessionId) {
                this.loggingManager.debug('Maestro', `Extracted Session ID in onExit: ${extractedSessionId}`);
                this.loggingManager.info('Maestro', `Session ID detected: ${extractedSessionId}`);

                // Update session with the actual session ID
                this.sessionManager.setCliSession(this.primaryAgent.name, {
                  sessionId: extractedSessionId,
                  isActive: true
                });
              } else if (this.config.get('verbose')) {
                this.loggingManager.debug('Maestro', 'No session ID found in final output');
              }
            } else if (this.config.get('verbose')) {
              this.loggingManager.debug('Maestro', `Session ID already captured: ${currentSession.sessionId}`);
            }

            // Format final output (no delegation processing needed)
            const cleanedOutput = this.outputFormatter.format(
              output,
              this.primaryAgent.name
            );

            // Update spinner with final status
            if (this.spinner) {
              if (exitCode === 0) {
                this.spinner.succeed(`✓ Claude Code completed`);
              } else {
                this.spinner.fail(`✗ Claude Code failed (exit code ${exitCode})`);
              }
            }

            // Log agent execution result
            if (exitCode === 0) {
              this.loggingManager.logAgentExecution(this.primaryAgent.name, 'completed', {
                exitCode,
                outputLength: cleanedOutput.length
              });
            } else {
              this.loggingManager.logAgentExecution(this.primaryAgent.name, 'failed', {
                exitCode,
                outputLength: cleanedOutput.length
              });
            }

            // Log agent response
            this.loggingManager.logAgentResponse(this.primaryAgent.name, cleanedOutput);

            // Add assistant message to session
            this.sessionManager.addAssistantMessage(cleanedOutput, this.primaryAgent.name);

            // Resolve with result
            resolve({
              agent: this.primaryAgent.name,
              content: cleanedOutput,
              exitCode
            });

          } catch (error) {
            if (this.spinner) {
              this.spinner.fail(`✗ Error processing output`);
            }

            // Get session ID if available
            const cliSession = this.sessionManager.getCliSession(this.primaryAgent.name);
            const sessionId = cliSession?.sessionId;

            const enrichedError = this.enrichError(error, {
              agent: this.primaryAgent.name,
              sessionId,
              operation: 'output_processing'
            });

            this.loggingManager.error(
              'Maestro',
              `Output processing failed: ${enrichedError.message}`,
              enrichedError instanceof MaestroError || enrichedError instanceof AgentError
                ? (enrichedError as MaestroError | AgentError).context
                : {}
            );

            this.logDetailedError(enrichedError, 'output_processing');

            reject(enrichedError);
          }
        });

      } catch (error) {
        if (this.spinner) {
          this.spinner.fail(`✗ Execution error`);
        }

        const enrichedError = this.enrichError(error, {
          agent: this.primaryAgent.name,
          operation: 'execution'
        });

        this.loggingManager.error(
          'Maestro',
          `Agent execution failed: ${enrichedError.message}`,
          enrichedError instanceof MaestroError || enrichedError instanceof AgentError
            ? (enrichedError as MaestroError | AgentError).context
            : {}
        );

        this.logDetailedError(enrichedError, 'agent_execution');

        reject(enrichedError);
      }
    });
  }

  /**
   * Setup event handlers for PTY process
   */
  private setupEventHandlers(
    processId: string,
    onData: (data: string) => void
  ): void {
    this.ptyManager.onData(processId, async (data: string) => {
      onData(data);

      // Try to extract Session ID early (during streaming)
      // This ensures we have the Session ID for the NEXT message
      this.tryExtractSessionId(data);

      // No complex parsing - data passes through
      // Spinner updates happen at start/end of execution in executePrimaryAgent
    });
  }

  /**
   * Try to extract Session ID from streaming output
   * Called during streaming to catch Session ID as early as possible
   */
  private tryExtractSessionId(data: string): void {
    const extractedSessionId = this.sessionIdExtractor.extract(data);

    if (extractedSessionId) {
      const currentSession = this.sessionManager.getCliSession(this.primaryAgent.name);

      // Only update if we don't have a session ID yet or if it's different
      if (!currentSession?.sessionId || currentSession.sessionId !== extractedSessionId) {
        this.loggingManager.debug('Maestro', `Extracted Session ID during streaming: ${extractedSessionId}`);

        this.sessionManager.setCliSession(this.primaryAgent.name, {
          sessionId: extractedSessionId,
          isActive: true
        });
      }
    }
  }

  /**
   * Get middleware manager for external configuration
   * @returns The middleware manager instance
   */
  getMiddlewareManager(): MiddlewareManager {
    return this.middlewareManager;
  }

  /**
   * Register a middleware
   * @param middleware - Middleware to register
   */
  useMiddleware(middleware: Middleware): void {
    this.middlewareManager.use(middleware);
    this.loggingManager.info('Maestro', `Registered middleware: ${middleware.name}`);
  }

  /**
   * Remove a middleware by name
   * @param name - Middleware name
   * @returns True if middleware was removed
   */
  removeMiddleware(name: string): boolean {
    const removed = this.middlewareManager.remove(name);
    if (removed) {
      this.loggingManager.info('Maestro', `Removed middleware: ${name}`);
    }
    return removed;
  }

  /**
   * Toggle Plan Mode on/off
   * Plan Mode enables research and planning without code execution
   *
   * @returns New Plan Mode state (true if enabled, false if disabled)
   *
   * @example
   * ```typescript
   * const isEnabled = maestro.togglePlanMode();
   * console.log(`Plan Mode is now ${isEnabled ? 'enabled' : 'disabled'}`);
   * ```
   */
  togglePlanMode(): boolean {
    const currentState = this.config.get('planMode');
    const newState = !currentState;
    this.config.set('planMode', newState);

    this.loggingManager.info('Maestro', `Plan Mode ${newState ? 'enabled' : 'disabled'}`);

    return newState;
  }

  /**
   * Check if Plan Mode is currently enabled
   * @returns True if Plan Mode is enabled
   */
  isPlanMode(): boolean {
    return this.config.get('planMode');
  }

  /**
   * Reset the current session
   * Clears the CLI session to start a fresh conversation
   *
   * @example
   * ```typescript
   * maestro.resetSession();
   * console.log('Session reset - starting fresh conversation');
   * ```
   */
  resetSession(): void {
    this.loggingManager.info('Maestro', 'Resetting session');
    this.sessionManager.clearCliSession(this.primaryAgent.name);
  }

  /**
   * Initialize context injection middleware if enabled in config
   */
  private initializeContextInjection(): void {
    const features = this.config.get('features');
    const contextConfig = this.config.get('contextInjection');

    // Check if context injection is enabled in features
    if (features?.contextInjection && contextConfig?.enabled) {
      const injector = new SmartContextInjector({
        enabled: contextConfig.enabled,
        includeGit: contextConfig.includeGit,
        includeEnv: contextConfig.includeEnv,
        includeProject: contextConfig.includeProject,
        smartSelection: contextConfig.smartSelection,
        maxRecentCommits: contextConfig.maxRecentCommits
      });

      this.middlewareManager.use(injector);
      this.loggingManager.debug('Maestro', 'Smart context injection enabled');
    }
  }
}
