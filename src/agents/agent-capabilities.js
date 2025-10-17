/**
 * Agent capabilities and strengths
 * Used for intelligent delegation decisions
 */

export const AGENT_STRENGTHS = {
  claude: {
    // Best suited for
    bestFor: [
      'refactoring',
      'architecture',
      'codebase-analysis',
      'design-patterns',
      'code-review',
      'debugging-complex-issues'
    ],

    // Performance ratings (1-10)
    ratings: {
      codeGeneration: 8,
      refactoring: 10,
      debugging: 9,
      testing: 8,
      documentation: 9,
      planning: 10,
      webSearch: 5,
      speed: 7
    },

    // Context handling
    contextWindow: '200k tokens',
    handlesBinaryFiles: false,
    mcpSupport: true
  },

  gemini: {
    // Best suited for
    bestFor: [
      'automation',
      'web-search',
      'content-generation',
      'data-analysis',
      'scripting',
      'multi-modal-tasks'
    ],

    // Performance ratings (1-10)
    ratings: {
      codeGeneration: 7,
      refactoring: 7,
      debugging: 7,
      testing: 8,
      documentation: 8,
      planning: 8,
      webSearch: 10,
      speed: 9
    },

    // Context handling
    contextWindow: '1M tokens',
    handlesBinaryFiles: true,
    mcpSupport: true
  },

  codex: {
    // Best suited for
    bestFor: [
      'code-generation',
      'completion',
      'boilerplate',
      'unit-tests',
      'quick-fixes',
      'pair-programming'
    ],

    // Performance ratings (1-10)
    ratings: {
      codeGeneration: 10,
      refactoring: 7,
      debugging: 8,
      testing: 9,
      documentation: 7,
      planning: 6,
      webSearch: 4,
      speed: 8
    },

    // Context handling
    contextWindow: '128k tokens',
    handlesBinaryFiles: false,
    mcpSupport: true
  }
};

/**
 * Suggest best agent for a given task type
 */
export function suggestAgentForTask(taskType) {
  const scores = {};

  for (const [agentName, capabilities] of Object.entries(AGENT_STRENGTHS)) {
    if (capabilities.bestFor.includes(taskType)) {
      scores[agentName] = 10;
    } else if (capabilities.ratings[taskType]) {
      scores[agentName] = capabilities.ratings[taskType];
    } else {
      scores[agentName] = 5; // Default score
    }
  }

  // Return sorted by score
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([agentName]) => agentName);
}

/**
 * Get capability rating for specific task
 */
export function getCapabilityRating(agentName, capability) {
  const agent = AGENT_STRENGTHS[agentName];
  if (!agent) return 0;

  return agent.ratings[capability] || 5;
}
