/**
 * Agent-specific constants
 *
 * IMPORTANT: AgentMaestro is a PURE WRAPPER for Claude Code only.
 *
 * Architecture Decision (TASK-002):
 * - AgentMaestro directly supports ONLY Claude Code
 * - Codex and Gemini are accessed ONLY via Claude Code's Subagent system
 * - Direct access to Codex/Gemini is NOT supported
 *
 * To use Codex/Gemini:
 * 1. Install Claude Code plugins: maestro-delegation-suite
 * 2. Ask Claude to delegate tasks naturally
 * 3. Claude spawns codex-delegator or gemini-delegator Subagents as needed
 *
 * @deprecated CODEX and GEMINI - Use Claude Code Subagents instead
 */

export const AGENT_NAMES = {
  CLAUDE: 'claude',
  /** @deprecated Use Claude Code Subagents (codex-delegator) instead */
  GEMINI: 'gemini',
  /** @deprecated Use Claude Code Subagents (gemini-delegator) instead */
  CODEX: 'codex'
} as const;

export const AGENT_COLORS = {
  CLAUDE: '#D97757',
  /** @deprecated Reference only - not directly accessible */
  GEMINI: '#4285F4',
  /** @deprecated Reference only - not directly accessible */
  CODEX: '#10A37F',
  MAESTRO: '#9B59B6'
} as const;

export const AGENT_PACKAGES = {
  CLAUDE: '@anthropic-ai/claude-code',
  /** @deprecated Reference only - access via Claude Subagents */
  GEMINI: '@google/gemini-cli',
  /** @deprecated Reference only - access via Claude Subagents */
  CODEX: '@openai/codex'
} as const;
