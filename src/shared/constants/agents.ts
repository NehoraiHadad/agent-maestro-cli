/**
 * Agent-specific constants
 *
 * IMPORTANT: AgentMaestro is a PURE WRAPPER for Claude Code only.
 *
 * Architecture Decision (TASK-002):
 * - AgentMaestro directly supports ONLY Claude Code
 * - Other AI agents (like Codex, Gemini) are accessed ONLY via Claude Code's Subagent system
 * - Direct access to other agents is NOT supported
 *
 * To use other AI agents:
 * 1. Install Claude Code plugins: maestro-delegation-suite
 * 2. Ask Claude to delegate tasks naturally
 * 3. Claude spawns appropriate Subagents (codex-delegator, gemini-delegator) as needed
 */

export const AGENT_NAMES = {
  CLAUDE: 'claude'
} as const;

export const AGENT_COLORS = {
  CLAUDE: '#D97757',
  MAESTRO: '#9B59B6'
} as const;

export const AGENT_PACKAGES = {
  CLAUDE: '@anthropic-ai/claude-code'
} as const;
