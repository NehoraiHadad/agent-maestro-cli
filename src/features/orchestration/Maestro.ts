/**
 * Maestro.ts
 * Simplified orchestrator - coordinates agent execution with live subagent detection
 */

import { Agent } from '../../domain/entities/index.js';
import { AgentRepository } from '../../domain/index.js';
import { PTYManager } from '../execution/pty/index.js';
import { StreamProcessor } from '../streaming/index.js';
import { OutputFormatter } from '../output/index.js';
import { Spinner, StatusUpdater } from '../ui/index.js';
import type { AgentExecutionResult } from '../../shared/types/index.js';
import { ConfigManager, MaestroConfig } from './ConfigManager.js';
import { SessionManager } from './SessionManager.js';
import { LoggingManager } from '../logging/index.js';

export interface MaestroStats {
  totalMessages: number;
  sessionDuration: number;
}

/**
 * Main orchestrator coordinating agent execution
 * Always uses Claude as the primary agent
 */
export class Maestro {
  private primaryAgent: Agent;
  private config: ConfigManager;
  private ptyManager: PTYManager;
  private streamProcessor: StreamProcessor;
  private outputFormatter: OutputFormatter;
  private agentRepository: AgentRepository;
  private sessionManager: SessionManager;
  private statusUpdater: StatusUpdater;
  private loggingManager: LoggingManager;
  private spinner: Spinner | null = null;
  private isRunning: boolean = false;

  /**
   * Create a new Maestro orchestrator
   * Always uses Claude as the primary agent
   * @param config - Optional configuration
   */
  constructor(config?: Partial<MaestroConfig>) {
    this.agentRepository = new AgentRepository();
    this.primaryAgent = this.agentRepository.findByName('claude');

    this.config = new ConfigManager(config);
    this.ptyManager = new PTYManager();
    this.sessionManager = new SessionManager();

    // Initialize logging manager
    this.loggingManager = new LoggingManager({
      enableFileLogging: this.config.get('enableFileLogging'),
      logLevel: this.config.get('logLevel'),
      logDirectory: this.config.get('logDirectory'),
      logRotation: this.config.get('logRotation'),
      maxLogFiles: this.config.get('maxLogFiles'),
      maxLogSizeBytes: this.config.get('maxLogSizeBytes')
    });

    this.streamProcessor = new StreamProcessor();
    this.outputFormatter = new OutputFormatter();
    this.statusUpdater = new StatusUpdater(undefined, this.loggingManager);
  }

  /**
   * Start the orchestrator
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
   * Send a message to the primary agent
   * @param message - User message
   * @returns Agent execution result
   */
  async sendMessage(message: string): Promise<AgentExecutionResult> {
    if (!this.isRunning) {
      throw new Error('Maestro is not running. Call start() first.');
    }

    // Log user message
    this.loggingManager.logUserMessage(message);

    // Add user message to session
    this.sessionManager.addUserMessage(message);

    // Execute primary agent
    return await this.executePrimaryAgent(message);
  }

  /**
   * Stop the orchestrator
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
      sessionDuration: summary.duration
    };
  }

  /**
   * Get logging manager for external access
   * @returns The logging manager instance
   */
  getLoggingManager(): LoggingManager {
    return this.loggingManager;
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
      this.spinner.start(`${this.primaryAgent.displayName}: starting...`, this.primaryAgent.color);
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
        if (this.config.get('verbose')) {
          console.log(`[DEBUG] Interactive mode: ${isInteractive}`);
          console.log(`[DEBUG] CLI session active: ${cliSession?.isActive ?? false}`);
          console.log(`[DEBUG] Should continue session: ${shouldContinueSession}`);
          console.log(`[DEBUG] Session ID: ${sessionId || 'none'}`);
          console.log(`[DEBUG] Using --resume with ID: ${useSessionId}`);
        }

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
        if (this.config.get('verbose')) {
          console.log(`[DEBUG] Command args: ${this.primaryAgent.command} ${args.join(' ')}`);
        }

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
            // (in case we missed it during streaming)
            const currentSession = this.sessionManager.getCliSession(this.primaryAgent.name);
            if (!currentSession?.sessionId) {
              const sessionIdPatterns = [
                /Session ID:\s*([a-zA-Z0-9_-]+)/i,           // Standard format
                /session[_-]id[:\s]+([a-zA-Z0-9_-]+)/i,      // Alternative formats
                /\bsession_([a-zA-Z0-9_-]{8,})\b/i           // session_<uuid> format
              ];

              let extractedSessionId: string | null = null;

              for (const pattern of sessionIdPatterns) {
                const match = output.match(pattern);
                if (match && match[1]) {
                  extractedSessionId = match[1];
                  break;
                }
              }

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
                this.spinner.succeed(`${this.primaryAgent.displayName}: completed`);
              } else {
                this.spinner.fail(`${this.primaryAgent.displayName}: failed (exit code ${exitCode})`);
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

            // Resolve with result (no delegations)
            resolve({
              agent: this.primaryAgent.name,
              content: cleanedOutput,
              delegations: [], // Claude Code handles delegations via Skills/Subagents
              exitCode
            });

          } catch (error) {
            if (this.spinner) {
              this.spinner.fail(`${this.primaryAgent.displayName}: error`);
            }

            // Log error
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.loggingManager.error('Maestro', `Output processing failed: ${errorMsg}`, {
              agent: this.primaryAgent.name,
              error: errorMsg
            });

            reject(error);
          }
        });

      } catch (error) {
        if (this.spinner) {
          this.spinner.fail(`${this.primaryAgent.displayName}: error`);
        }

        // Log execution error
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.loggingManager.error('Maestro', `Agent execution failed: ${errorMsg}`, {
          agent: this.primaryAgent.name,
          error: errorMsg
        });

        reject(error);
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

      // Process streaming events for status updates
      const lines = data.split('\n');
      for (const line of lines) {
        // Update spinner with status
        const statusUpdate = this.streamProcessor.processEvent(this.primaryAgent.name, line);
        if (statusUpdate && this.statusUpdater) {
          this.statusUpdater.update(
            this.primaryAgent.name,
            statusUpdate.status,
            this.primaryAgent.color
          );
        }
      }
    });
  }

  /**
   * Try to extract Session ID from streaming output
   * Called during streaming to catch Session ID as early as possible
   */
  private tryExtractSessionId(data: string): void {
    // Claude Code outputs session ID in format: "Session ID: <uuid>"
    // We want to extract this ASAP so it's available for the next message
    const sessionIdPatterns = [
      /Session ID:\s*([a-zA-Z0-9_-]+)/i,           // Standard format
      /session[_-]id[:\s]+([a-zA-Z0-9_-]+)/i,      // Alternative formats
      /\bsession_([a-zA-Z0-9_-]{8,})\b/i           // session_<uuid> format
    ];

    for (const pattern of sessionIdPatterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        const extractedSessionId = match[1];
        const currentSession = this.sessionManager.getCliSession(this.primaryAgent.name);

        // Only update if we don't have a session ID yet or if it's different
        if (!currentSession?.sessionId || currentSession.sessionId !== extractedSessionId) {
          this.loggingManager.debug('Maestro', `Extracted Session ID during streaming: ${extractedSessionId}`);

          this.sessionManager.setCliSession(this.primaryAgent.name, {
            sessionId: extractedSessionId,
            isActive: true
          });
        }
        break;
      }
    }
  }

  /**
   * Toggle Plan Mode on/off
   * @returns New Plan Mode state
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
   */
  resetSession(): void {
    this.loggingManager.info('Maestro', 'Resetting session');
    this.sessionManager.clearCliSession(this.primaryAgent.name);
  }
}
