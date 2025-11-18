/**
 * Agent Repository - manages agent registry and retrieval
 */
import { Agent } from '../entities/Agent.js';
import type { Agent as AgentType, AgentName } from '../../shared/types/index.js';
import { AgentNotFoundError } from '../../shared/errors/index.js';
import { AGENT_NAMES, AGENT_COLORS, AGENT_PACKAGES } from '../../shared/constants/index.js';
import { CircuitBreaker } from '../../shared/utils/index.js';

export class AgentRepository {
  private agents: Map<AgentName, Agent>;
  private circuitBreakers: Map<AgentName, CircuitBreaker>;

  constructor() {
    this.agents = new Map();
    this.circuitBreakers = new Map();
    this.initializeDefaultAgents();
  }

  /**
   * Initialize default agents
   * Note: AgentMaestro is a wrapper for Claude Code only.
   * Claude Code can delegate to other agents (Codex, Gemini) via its native Subagent system.
   */
  private initializeDefaultAgents(): void {
    const defaultAgents: AgentType[] = [
      {
        name: AGENT_NAMES.CLAUDE,
        displayName: 'Claude Code',
        command: 'claude',
        description: 'Anthropic Claude - Primary agent for AgentMaestro wrapper',
        capabilities: [
          'Code refactoring',
          'Codebase analysis',
          'Architectural planning',
          'File editing',
          'MCP integration',
          'Native Subagent delegation to Codex/Gemini'
        ],
        flags: {
          prompt: '--print',
          json: ['--output-format', 'json'],
          stream: ['--output-format', 'stream-json', '--verbose']
        },
        requiresAuth: true,
        authType: 'Claude Pro/Max subscription',
        packageName: AGENT_PACKAGES.CLAUDE,
        color: AGENT_COLORS.CLAUDE
      }
      // Only Claude - AgentMaestro is a wrapper for Claude Code only
      // For Codex/Gemini access, Claude Code handles delegation via Subagents
    ];

    defaultAgents.forEach(config => {
      const agent = new Agent(config);
      this.agents.set(agent.name, agent);
    });
  }

  /**
   * Find agent by name
   */
  findByName(name: string): Agent {
    const agent = this.agents.get(name as AgentName);
    if (!agent) {
      throw new AgentNotFoundError(name);
    }
    return agent;
  }

  /**
   * Get all agents
   */
  findAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Register a new agent
   */
  register(config: AgentType): Agent {
    const agent = new Agent(config);
    this.agents.set(agent.name, agent);
    return agent;
  }

  /**
   * Check if agent exists
   */
  exists(name: string): boolean {
    return this.agents.has(name as AgentName);
  }

  /**
   * Get agents excluding specific agent
   */
  findAllExcept(excludeName: string): Agent[] {
    return this.findAll().filter(agent => agent.name !== excludeName);
  }

  /**
   * Get or create circuit breaker for agent
   */
  private getCircuitBreaker(agentName: AgentName): CircuitBreaker {
    if (!this.circuitBreakers.has(agentName)) {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 30000,
        onStateChange: (oldState, newState) => {
          console.warn(`[AgentRepository] Circuit breaker for ${agentName}: ${oldState} -> ${newState}`);
        }
      });
      this.circuitBreakers.set(agentName, breaker);
    }
    return this.circuitBreakers.get(agentName)!;
  }

  /**
   * Execute agent operation with circuit breaker protection
   */
  async executeWithProtection<T>(
    agentName: AgentName,
    operation: () => Promise<T>
  ): Promise<T> {
    const breaker = this.getCircuitBreaker(agentName);
    return breaker.execute(operation);
  }

  /**
   * Get circuit breaker stats for an agent
   */
  getCircuitStats(agentName: AgentName): ReturnType<CircuitBreaker['getStats']> | null {
    const breaker = this.circuitBreakers.get(agentName);
    return breaker ? breaker.getStats() : null;
  }

  /**
   * Reset circuit breaker for an agent
   */
  resetCircuit(agentName: AgentName): void {
    const breaker = this.circuitBreakers.get(agentName);
    if (breaker) {
      breaker.reset();
    }
  }
}
