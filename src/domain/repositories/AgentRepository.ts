/**
 * Agent Repository - manages agent registry and retrieval
 */
import { Agent } from '../entities/Agent.js';
import type { Agent as AgentType, AgentName } from '../../shared/types/index.js';
import { AgentNotFoundError } from '../../shared/errors/index.js';
import { AGENT_NAMES, AGENT_COLORS, AGENT_PACKAGES } from '../../shared/constants/index.js';

export class AgentRepository {
  private agents: Map<AgentName, Agent>;

  constructor() {
    this.agents = new Map();
    this.initializeDefaultAgents();
  }

  /**
   * Initialize default agents
   */
  private initializeDefaultAgents(): void {
    const defaultAgents: AgentType[] = [
      {
        name: AGENT_NAMES.CLAUDE,
        displayName: 'Claude Code',
        command: 'claude',
        description: 'Anthropic Claude - Best for codebase navigation, refactoring, and architectural decisions',
        capabilities: [
          'Code refactoring',
          'Codebase analysis',
          'Architectural planning',
          'File editing',
          'MCP integration'
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
      },
      {
        name: AGENT_NAMES.GEMINI,
        displayName: 'Gemini CLI',
        command: 'gemini',
        description: 'Google Gemini - Best for automation, web search, and content generation',
        capabilities: [
          'Task automation',
          'Web search grounding',
          'Content generation',
          'File operations',
          'Custom tool integration'
        ],
        flags: {
          prompt: '-p',
          json: ['--output-format', 'json'],
          stream: ['--output-format', 'stream-json']
        },
        requiresAuth: true,
        authType: 'Google account / AI Studio key',
        packageName: AGENT_PACKAGES.GEMINI,
        color: AGENT_COLORS.GEMINI
      },
      {
        name: AGENT_NAMES.CODEX,
        displayName: 'OpenAI Codex',
        command: 'codex',
        description: 'OpenAI Codex - Best for code generation, completion, and pair programming',
        capabilities: [
          'Code generation',
          'Code completion',
          'Debugging assistance',
          'Unit test creation',
          'Multiple autonomy modes'
        ],
        flags: {
          prompt: 'exec',
          stream: ['--json'],
          mode: {
            suggest: '--mode suggest',
            autoEdit: '--mode auto-edit',
            fullAuto: '--mode full-auto'
          }
        },
        requiresAuth: true,
        authType: 'ChatGPT account / OPENAI_API_KEY',
        packageName: AGENT_PACKAGES.CODEX,
        color: AGENT_COLORS.CODEX
      }
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
}
