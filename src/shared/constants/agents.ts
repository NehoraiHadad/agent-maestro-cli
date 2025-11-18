/**
 * Agent-specific constants
 *
 * Note: AgentMaestro only wraps Claude Code directly.
 * Codex and Gemini are accessed via Claude's Subagent system.
 * These constants are kept for reference and potential future use.
 */

export const AGENT_NAMES = {
  CLAUDE: 'claude',
  GEMINI: 'gemini',  // Accessed via Claude Code Subagents
  CODEX: 'codex'     // Accessed via Claude Code Subagents
} as const;

export const AGENT_COLORS = {
  CLAUDE: '#D97757',
  GEMINI: '#4285F4',  // Reference only
  CODEX: '#10A37F',   // Reference only
  MAESTRO: '#9B59B6'
} as const;

export const AGENT_PACKAGES = {
  CLAUDE: '@anthropic-ai/claude-code',
  GEMINI: '@google/gemini-cli',  // Reference only
  CODEX: '@openai/codex'         // Reference only
} as const;
