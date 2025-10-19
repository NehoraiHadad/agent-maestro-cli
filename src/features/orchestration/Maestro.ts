/**
 * Maestro.ts
 * Simplified orchestrator - coordinates agent execution with live subagent detection
 */

import { Agent } from '../../domain/entities/index.js';
import { AgentRepository } from '../../domain/index.js';
import { PTYManager } from '../execution/pty/index.js';
import { StreamProcessor } from '../streaming/index.js';
import { OutputFormatter } from '../output/index.js';
import { Spinner, StatusUpdater, ConsoleLogger } from '../ui/index.js';
import type { AgentName, AgentExecutionResult } from '../../shared/types/index.js';
import { ConfigManager, MaestroConfig } from './ConfigManager.js';
import { SessionManager } from './SessionManager.js';
import { LoggingManager } from '../logging/index.js';

export interface MaestroStats {
  totalMessages: number;
  sessionDuration: number;
}

/**
 * Main orchestrator coordinating agent execution
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
  private logger: ConsoleLogger;
  private spinner: Spinner | null = null;
  private isRunning: boolean = false;

  /**
   * Create a new Maestro orchestrator
   * @param primaryAgentName - Name of the primary agent to use
   * @param config - Optional configuration
   */
  constructor(primaryAgentName: AgentName, config?: Partial<MaestroConfig>) {
    this.agentRepository = new AgentRepository();
    this.primaryAgent = this.agentRepository.findByName(primaryAgentName);

    this.config = new ConfigManager(config);
    this.ptyManager = new PTYManager();
    this.sessionManager = new SessionManager();
    this.logger = new ConsoleLogger();

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
    this.statusUpdater = new StatusUpdater();
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

    // Cleanup subsystems
    this.ptyManager.killAll();

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
   * Detect if Claude Code is using a subagent (live detection)
   */
  private detectSubagentUsage(chunk: string): void {
    // Detect Task tool usage for subagents
    if (chunk.includes('codex-delegator') || chunk.includes('gemini-delegator')) {
      // Extract which subagent
      const agent = chunk.includes('codex-delegator') ? 'Codex' : 'Gemini';
      this.logger.info(`🔄 [Live] Delegating to ${agent} subagent...`);
      this.loggingManager.info('Maestro', `Detected subagent delegation to ${agent}`);
    }

    // Detect completion
    if (chunk.includes('Task tool') && chunk.includes('completed')) {
      this.logger.success(`✓ [Live] Subagent completed`);
    }
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
        // Check if we have an active CLI session for continuation
        const cliSession = this.sessionManager.getCliSession(this.primaryAgent.name);
        const hasActiveSession = cliSession?.isActive ?? false;

        // Debug logging
        if (this.config.get('verbose')) {
          console.log(`[DEBUG] Has active session: ${hasActiveSession}`);
          console.log(`[DEBUG] Session ID: ${cliSession?.sessionId || 'none'}`);
        }

        // Get execution arguments with streaming and continuation support
        // NO delegation prompt - Claude Code Skills/Subagents handle delegation
        const args = this.primaryAgent.getExecutionArgs(message, {
          stream: true,
          continueSession: hasActiveSession,
          sessionId: cliSession?.sessionId
        });

        // Debug logging
        if (this.config.get('verbose')) {
          console.log(`[DEBUG] Command args: ${this.primaryAgent.command} ${args.join(' ')}`);
        }

        // Activate session for next time (if this is first interaction)
        if (!hasActiveSession) {
          this.sessionManager.activateCliSession(this.primaryAgent.name);
        }

        // Spawn PTY process
        this.ptyManager.spawn(processId, this.primaryAgent.command, args);

        // Setup event handlers
        this.setupEventHandlers(processId, (data) => {
          output += data;

          // Live detection of subagent usage
          this.detectSubagentUsage(data);
        });

        // Handle exit
        this.ptyManager.onExit(processId, async (exitInfo) => {
          exitCode = exitInfo.exitCode;

          try {
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
}
