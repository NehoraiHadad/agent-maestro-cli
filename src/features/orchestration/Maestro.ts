/**
 * Maestro.ts
 * Main orchestrator - coordinates all subsystems for agent execution
 */

import { Agent } from '../../domain/entities/index.js';
import { AgentRepository, ProtocolService } from '../../domain/index.js';
import { PTYManager } from '../execution/pty/index.js';
import { Delegator } from '../delegation/index.js';
import { StreamProcessor } from '../streaming/index.js';
import { OutputFormatter } from '../output/index.js';
import { Spinner, StatusUpdater } from '../ui/index.js';
import type { AgentName, AgentExecutionResult, DelegationResult } from '../../shared/types/index.js';
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
  private delegator: Delegator;
  private streamProcessor: StreamProcessor;
  private outputFormatter: OutputFormatter;
  private agentRepository: AgentRepository;
  private protocolService: ProtocolService;
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
    this.delegator = new Delegator({
      inactivityTimeout: this.config.get('inactivityTimeout'),
      maxDepth: this.config.get('maxDelegationDepth')
    });
    this.streamProcessor = new StreamProcessor();
    this.outputFormatter = new OutputFormatter();
    this.protocolService = new ProtocolService();
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
    this.delegator.cleanup();
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
    const delegations: DelegationResult[] = [];
    let output = '';
    let exitCode = 0;

    // Start spinner
    if (this.spinner) {
      this.spinner.start(`${this.primaryAgent.displayName}: starting...`, this.primaryAgent.color);
    }

    return new Promise<AgentExecutionResult>((resolve, reject) => {
      try {
        // Get execution arguments with streaming enabled
        const args = this.primaryAgent.getExecutionArgs(message, { stream: true });

        // Spawn PTY process
        this.ptyManager.spawn(processId, this.primaryAgent.command, args);

        // Setup event handlers
        this.setupEventHandlers(processId, delegations, (data) => {
          output += data;
        });

        // Handle exit
        this.ptyManager.onExit(processId, async (exitInfo) => {
          exitCode = exitInfo.exitCode;

          // Format output
          const cleanedOutput = this.outputFormatter.format(output, this.primaryAgent.name);

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

          // Resolve with result
          resolve({
            agent: this.primaryAgent.name,
            content: cleanedOutput,
            delegations,
            exitCode
          });
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
    delegations: DelegationResult[],
    onData: (data: string) => void
  ): void {
    this.ptyManager.onData(processId, async (data: string) => {
      onData(data);

      // Process streaming events for status updates
      const lines = data.split('\n');
      for (const line of lines) {
        // Check for delegation requests
        if (this.protocolService.isDelegationRequest(line)) {
          await this.processDelegation(line, delegations);
        }

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
   * Process a delegation request
   */
  private async processDelegation(
    line: string,
    delegations: DelegationResult[]
  ): Promise<void> {
    try {
      const request = this.protocolService.parseDelegationRequest(line);
      const targetAgent = this.agentRepository.findByName(request.agent as AgentName);

      // Update spinner
      if (this.spinner) {
        this.spinner.update(
          `Delegating to ${targetAgent.displayName}...`,
          targetAgent.color
        );
      }

      // Execute delegation
      const result = await this.delegator.execute(targetAgent, request.prompt, {
        priority: request.priority,
        timeout: request.timeout
      });

      // Store delegation result
      delegations.push({
        fromAgent: this.primaryAgent.name,
        toAgent: targetAgent.name,
        prompt: request.prompt,
        result
      });

      // Add delegation message to session
      this.sessionManager.addDelegationMessage(
        this.primaryAgent.name,
        targetAgent.name,
        result
      );

      // Update spinner back to primary agent
      if (this.spinner) {
        this.spinner.update(
          `${this.primaryAgent.displayName}: processing...`,
          this.primaryAgent.color
        );
      }

    } catch (error) {
      // Log error but don't fail the whole execution
      if (this.config.get('verbose')) {
        console.error('Delegation error:', error);
      }
    }
  }
}
