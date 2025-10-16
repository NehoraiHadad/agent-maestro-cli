/**
 * Agent configuration for CLI commands
 */
export const AGENTS = {
  claude: {
    name: 'claude',
    command: 'claude',
    description: 'Anthropic Claude - Best for refactoring and codebase navigation',
    flags: {
      prompt: '-p',
      json: '--output-format json',
      stream: '--output-format stream-json'
    }
  },
  gemini: {
    name: 'gemini',
    command: 'gemini',
    description: 'Google Gemini - Best for automation and content generation',
    flags: {
      prompt: '-p',
      json: '--output-format json',
      stream: '--output-format stream-json'
    }
  },
  codex: {
    name: 'codex',
    command: 'codex',
    description: 'OpenAI Codex - Best for code generation and completion',
    flags: {
      prompt: '-p',
      json: '--output-format json',
      stream: '--output-format stream-json'
    }
  }
};

export const DELEGATION_PREFIX = 'MAESTRO_DELEGATE::';

export const MAESTRO_CONFIG = {
  delegationTimeout: 30000,
  maxDelegationDepth: 3
};

