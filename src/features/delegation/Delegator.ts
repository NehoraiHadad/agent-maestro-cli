/**
 * Delegator - main delegation orchestrator
 */
import type { DelegationOptions, DelegationRequest } from '../../shared/types/index.js';
import { Agent } from '../../domain/entities/index.js';
import { PTYManager } from '../execution/pty/index.js';
import { AgentRepository } from '../../domain/repositories/index.js';
import { MaxDelegationDepthError, DelegationError } from '../../shared/errors/index.js';
import { DEFAULT_INACTIVITY_TIMEOUT, DEFAULT_MAX_DELEGATION_DEPTH } from '../../shared/constants/index.js';
import { TimeoutManager } from './TimeoutManager.js';
import { ResultFormatter } from './ResultFormatter.js';
import type { SessionManager } from '../orchestration/SessionManager.js';

export interface DelegationConfig {
  inactivityTimeout?: number;
  maxDepth?: number;
}

/**
 * Orchestrates delegation of tasks to sub-agents
 */
export class Delegator {
  private ptyManager: PTYManager;
  private agentRepository: AgentRepository;
  private resultFormatter: ResultFormatter;
  private currentDepth: number;
  private maxDepth: number;
  private inactivityTimeout: number;
  private sessionManager: SessionManager | null = null;

  constructor(config: DelegationConfig = {}) {
    this.ptyManager = new PTYManager();
    this.agentRepository = new AgentRepository();
    this.resultFormatter = new ResultFormatter();
    this.currentDepth = 0;
    this.maxDepth = config.maxDepth ?? DEFAULT_MAX_DELEGATION_DEPTH;
    this.inactivityTimeout = config.inactivityTimeout ?? DEFAULT_INACTIVITY_TIMEOUT;
  }

  /**
   * Set the session manager for session continuity support
   */
  setSessionManager(sessionManager: SessionManager): void {
    this.sessionManager = sessionManager;
  }

  /**
   * Execute a delegation to another agent
   */
  async execute(agent: Agent, prompt: string, options: DelegationOptions = {}): Promise<string> {
    if (this.currentDepth >= this.maxDepth) {
      throw new MaxDelegationDepthError(this.maxDepth, this.currentDepth);
    }

    this.currentDepth++;
    try {
      return await this.runDelegation(agent, prompt, options);
    } finally {
      this.currentDepth--;
    }
  }

  /**
   * Execute multiple delegations in parallel
   */
  async executeParallel(requests: DelegationRequest[]): Promise<string[]> {
    const promises = requests.map(async (req) => {
      try {
        const agent = this.agentRepository.findByName(req.agent);
        return await this.execute(agent, req.prompt, {
          priority: req.priority,
          timeout: req.timeout
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        return this.resultFormatter.formatError(req.agent, err);
      }
    });
    return Promise.all(promises);
  }

  getDepth(): number {
    return this.currentDepth;
  }

  reset(): void {
    this.currentDepth = 0;
  }

  cleanup(): void {
    this.ptyManager.killAll();
    this.reset();
  }

  /**
   * Run the actual delegation
   */
  private async runDelegation(agent: Agent, prompt: string, options: DelegationOptions): Promise<string> {
    const processId = `delegation-${agent.name}-${Date.now()}`;
    const timeout = options.inactivityTimeout ?? this.inactivityTimeout;

    let output = '';
    let hasTimedOut = false;
    let timeoutManager: TimeoutManager | null = null;

    return new Promise<string>((resolve, reject) => {
      try {
        timeoutManager = new TimeoutManager(timeout, () => {
          hasTimedOut = true;
          this.ptyManager.kill(processId);
          resolve(this.resultFormatter.formatTimeout(agent.name, timeout));
        });

        // Check if we have an active CLI session for continuation
        const cliSession = this.sessionManager?.getCliSession(agent.name);
        const hasActiveSession = cliSession?.isActive ?? false;

        // Get execution arguments with continuation support
        const args = agent.getExecutionArgs(prompt, {
          continueSession: hasActiveSession,
          sessionId: cliSession?.sessionId
        });

        // Activate session for next time (if this is first interaction)
        if (!hasActiveSession && this.sessionManager) {
          this.sessionManager.activateCliSession(agent.name);
        }

        this.ptyManager.spawn(processId, agent.command, args);
        timeoutManager.start();

        this.ptyManager.onData(processId, (data: string) => {
          output += data;
          if (timeoutManager && !hasTimedOut) {
            timeoutManager.reset();
          }
        });

        this.ptyManager.onExit(processId, (exitInfo) => {
          timeoutManager?.clear();
          if (hasTimedOut) return;

          const cleanedOutput = output.trim();
          if (exitInfo.exitCode === 0) {
            resolve(this.resultFormatter.format(agent.name, cleanedOutput, true));
          } else {
            const error = new DelegationError(
              `Agent exited with code ${exitInfo.exitCode}`,
              agent.name,
              { exitCode: exitInfo.exitCode }
            );
            resolve(this.resultFormatter.formatError(agent.name, error));
          }
        });
      } catch (error) {
        timeoutManager?.clear();
        const err = error instanceof Error ? error : new DelegationError(String(error), agent.name);
        reject(err);
      }
    });
  }
}
