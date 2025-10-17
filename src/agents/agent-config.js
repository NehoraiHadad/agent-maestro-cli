/**
 * Agent configuration for CLI commands
 * Each agent has specific capabilities and command-line interfaces
 */

export const AGENTS = {
  claude: {
    name: 'claude',
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
      prompt: '-p',
      json: '--output-format json',
      stream: '--output-format stream-json'
    },
    requiresAuth: true,
    authType: 'Claude Pro/Max subscription',
    packageName: '@anthropic-ai/claude-code',
    color: '#D97757' // Claude brand color
  },

  gemini: {
    name: 'gemini',
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
      json: '--output-format json',
      stream: '--output-format stream-json'
    },
    requiresAuth: true,
    authType: 'Google account / AI Studio key',
    packageName: '@google/gemini-cli',
    color: '#4285F4' // Google brand color
  },

  codex: {
    name: 'codex',
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
      // Codex uses 'exec' subcommand for non-interactive mode
      prompt: 'exec',  // Not a flag, but a subcommand
      json: '--output-format json',
      stream: '--output-format stream-json',
      mode: {
        suggest: '--mode suggest',
        autoEdit: '--mode auto-edit',
        fullAuto: '--mode full-auto'
      }
    },
    requiresAuth: true,
    authType: 'ChatGPT account / OPENAI_API_KEY',
    packageName: '@openai/codex',
    color: '#10A37F' // OpenAI brand color
  }
};

/**
 * Get agent by name
 */
export function getAgent(name) {
  const agent = AGENTS[name];
  if (!agent) {
    throw new Error(`Unknown agent: ${name}`);
  }
  return agent;
}

/**
 * Get all available agents
 */
export function getAllAgents() {
  return Object.values(AGENTS);
}

/**
 * Get agents list for CLI display
 */
export function getAgentsForDisplay() {
  return getAllAgents().map(agent => ({
    name: agent.displayName,
    value: agent.name,
    description: agent.description
  }));
}

/**
 * Check if agent command is available in system
 */
export async function checkAgentAvailability(agentName) {
  const agent = getAgent(agentName);

  try {
    const { execSync } = await import('child_process');
    execSync(`which ${agent.command}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}
