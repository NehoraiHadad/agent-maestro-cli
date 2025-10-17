/**
 * Maestro.ts
 * Main orchestrator - coordinates all subsystems for agent execution
 */

import { Agent } from '../../domain/entities/index.js';
import { AgentRepository } from '../../domain/index.js';
import { PTYManager } from '../execution/pty/index.js';
import { DelegationOrchestrator } from '../delegation/index.js';
import { StreamProcessor } from '../streaming/index.js';
import { OutputFormatter } from '../output/index.js';
import { Spinner, StatusUpdater } from '../ui/index.js';
import type { AgentName, AgentExecutionResult } from '../../shared/types/index.js';
import { ConfigManager, MaestroConfig } from './ConfigManager.js';
import { SessionManager } from './SessionManager.js';

export interface MaestroStats {
  totalMessages: number;
  totalDelegations: number;
  sessionDuration: number;
}

/**
 * Main orchestrator coordinating all features
 */
export class Maestro {
  private primaryAgent: Agent;
  private config: ConfigManager;
  private ptyManager: PTYManager;
  private delegationOrchestrator: DelegationOrchestrator;
  private streamProcessor: StreamProcessor;
  private outputFormatter: OutputFormatter;
  private agentRepository: AgentRepository;
  private sessionManager: SessionManager;
  private statusUpdater: StatusUpdater;
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
    this.delegationOrchestrator = new DelegationOrchestrator({
      inactivityTimeout: this.config.get('inactivityTimeout'),
      maxDepth: this.config.get('maxDelegationDepth'),
      autoSuggest: true,
      logDelegations: this.config.get('verbose')
    });
    this.streamProcessor = new StreamProcessor();
    this.outputFormatter = new OutputFormatter();
    this.sessionManager = new SessionManager();
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

    // Initialize spinner if enabled
    if (this.config.get('showSpinner')) {
      this.spinner = new Spinner();
      this.statusUpdater.setSpinner(this.spinner);
    }
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

    // Stop spinner
    if (this.spinner) {
      this.spinner.stop();
    }

    // Cleanup subsystems
    this.ptyManager.killAll();
    this.delegationOrchestrator.cleanup();
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
      totalDelegations: summary.delegationMessages,
      sessionDuration: summary.duration
    };
  }

  /**
   * Execute the primary agent with streaming
   */
  private async executePrimaryAgent(message: string): Promise<AgentExecutionResult> {
    const processId = `maestro-${this.primaryAgent.name}-${Date.now()}`;
    let output = '';
    let exitCode = 0;

    // Set current agent context for delegation orchestrator
    this.delegationOrchestrator.setCurrentAgent(this.primaryAgent.name);

    // Start spinner
    if (this.spinner) {
      this.spinner.start(`${this.primaryAgent.displayName}: starting...`, this.primaryAgent.color);
    }

    return new Promise<AgentExecutionResult>((resolve, reject) => {
      try {
        // Get execution arguments with streaming enabled and optional delegation prompt
        const args = this.primaryAgent.getExecutionArgs(message, {
          stream: true,
          includeDelegationPrompt: this.config.get('includeDelegationPrompt')
        });

        // Spawn PTY process
        this.ptyManager.spawn(processId, this.primaryAgent.command, args);

        // Setup event handlers
        this.setupEventHandlers(processId, (data) => {
          output += data;
        });

        // Handle exit - Process delegations AFTER agent completes
        this.ptyManager.onExit(processId, async (exitInfo) => {
          exitCode = exitInfo.exitCode;

          try {
            // Process delegations from complete output
            const delegationResult = await this.delegationOrchestrator.processOutput(output);

            // Use cleaned output (without delegation markers)
            const cleanedOutput = this.outputFormatter.format(
              delegationResult.cleanOutput,
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

            // Add assistant message to session
            this.sessionManager.addAssistantMessage(cleanedOutput, this.primaryAgent.name);

            // Add delegation messages to session
            for (const delegation of delegationResult.delegations) {
              if (delegation.success && delegation.result) {
                this.sessionManager.addDelegationMessage(
                  this.primaryAgent.name,
                  delegation.agent,
                  delegation.result
                );
              }
            }

            // Resolve with result including delegations
            resolve({
              agent: this.primaryAgent.name,
              content: cleanedOutput,
              delegations: delegationResult.delegations.map(d => ({
                fromAgent: this.primaryAgent.name,
                toAgent: d.agent,
                prompt: d.task,
                result: d.result || d.error || ''
              })),
              exitCode
            });

          } catch (error) {
            if (this.spinner) {
              this.spinner.fail(`${this.primaryAgent.displayName}: delegation error`);
            }
            reject(error);
          }
        });

      } catch (error) {
        if (this.spinner) {
          this.spinner.fail(`${this.primaryAgent.displayName}: error`);
        }
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
