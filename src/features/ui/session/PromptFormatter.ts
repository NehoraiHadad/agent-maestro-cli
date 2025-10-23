/**
 * PromptFormatter - formats CLI prompts based on session state
 */
import chalk from 'chalk';

export class PromptFormatter {
  /**
   * Get formatted prompt based on Plan Mode state
   * @param isPlanMode - Whether Plan Mode is enabled
   * @returns Formatted prompt string
   */
  getPrompt(isPlanMode: boolean): string {
    if (isPlanMode) {
      return chalk.yellow.bold('\n[PLAN] You > ');
    }
    return chalk.cyan.bold('\nYou > ');
  }

  /**
   * Format Plan Mode status change message
   * @param enabled - Whether Plan Mode was enabled or disabled
   * @returns Formatted status message
   */
  formatPlanModeChange(enabled: boolean): string {
    if (enabled) {
      return '📋 Plan Mode enabled - Claude will research and plan without executing';
    }
    return '✓ Plan Mode disabled - Normal execution mode';
  }
}
