/**
 * Agent-specific constants
 */

export const AGENT_NAMES = {
  CLAUDE: 'claude',
  GEMINI: 'gemini',
  CODEX: 'codex'
} as const;

export const AGENT_COLORS = {
  CLAUDE: '#D97757',
  GEMINI: '#4285F4',
  CODEX: '#10A37F',
  MAESTRO: '#9B59B6'
} as const;

export const AGENT_PACKAGES = {
  CLAUDE: '@anthropic-ai/claude-code',
  GEMINI: '@google/gemini-cli',
  CODEX: '@openai/codex'
} as const;
