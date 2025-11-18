/**
 * StatusUpdater.ts
 * Updates spinner based on agent status changes
 */

import chalk from 'chalk';
import { Spinner } from './Spinner.js';
import type { LoggingManager } from '../../logging/index.js';

/**
 * Manages spinner updates based on agent activity
 */
export class StatusUpdater {
  private spinner: Spinner | null = null;
  private lastStatus: string = '';
  private loggingManager: LoggingManager | null = null;

  /**
   * Create a new StatusUpdater
   * @param spinner - Optional spinner instance to manage
   * @param loggingManager - Optional logging manager for delegation tracking
   */
  constructor(spinner?: Spinner, loggingManager?: LoggingManager) {
    this.spinner = spinner || null;
    this.loggingManager = loggingManager || null;
  }

  /**
   * Set the spinner instance
   * @param spinner - Spinner to use for updates
   */
  setSpinner(spinner: Spinner): void {
    this.spinner = spinner;
  }

  /**
   * Update spinner with new agent status
   * @param agentName - Name of the agent
   * @param status - Status message to display
   * @param color - Optional color for the status
   */
  update(agentName: string, status: string, color?: string): void {
    if (!this.spinner) {
      return;
    }

    // Check for delegation start marker
    if (status.startsWith('🔄 DELEGATION_START:')) {
      const delegateeName = status.replace('🔄 DELEGATION_START:', '').trim();
      this.showDelegationNotification(delegateeName);
      // Update spinner with delegation status
      const delegationStatus = `delegating to ${delegateeName}...`;
      this.spinner.update(this.formatStatus(agentName, delegationStatus), 'cyan');
      this.lastStatus = delegationStatus;
      return;
    }

    // Skip redundant updates
    if (!this.shouldUpdate(status)) {
      return;
    }

    const formattedStatus = this.formatStatus(agentName, status);
    this.spinner.update(formattedStatus, color);
    this.lastStatus = status;
  }

  /**
   * Show delegation notification to user
   * @param delegateeName - Name of the subagent being delegated to
   */
  private showDelegationNotification(delegateeName: string): void {
    // Show that Claude is using a subagent (not maestro delegating)
    console.log(`\n  ${chalk.yellow('→')} ${chalk.cyan.bold(`[${delegateeName}]`)} ${chalk.gray('Claude is delegating...')}`);

    // Log delegation to file
    if (this.loggingManager) {
      this.loggingManager.info('StatusUpdater', `Claude delegating to ${delegateeName} subagent`);
    }
  }

  /**
   * Update with success state
   * @param agentName - Name of the agent
   * @param message - Success message
   */
  succeed(agentName: string, message: string): void {
    if (!this.spinner) {
      return;
    }

    const formatted = this.formatStatus(agentName, message);
    this.spinner.succeed(formatted);
    this.reset();
  }

  /**
   * Update with failure state
   * @param agentName - Name of the agent
   * @param message - Failure message
   */
  fail(agentName: string, message: string): void {
    if (!this.spinner) {
      return;
    }

    const formatted = this.formatStatus(agentName, message);
    this.spinner.fail(formatted);
    this.reset();
  }

  /**
   * Update with warning state
   * @param agentName - Name of the agent
   * @param message - Warning message
   */
  warn(agentName: string, message: string): void {
    if (!this.spinner) {
      return;
    }

    const formatted = this.formatStatus(agentName, message);
    this.spinner.warn(formatted);
    this.reset();
  }

  /**
   * Reset the updater state
   */
  reset(): void {
    this.lastStatus = '';
  }

  /**
   * Check if the status should trigger an update
   */
  private shouldUpdate(newStatus: string): boolean {
    // Always update if status changed
    if (newStatus !== this.lastStatus) {
      return true;
    }

    // Skip duplicate updates
    return false;
  }

  /**
   * Format status message with agent name
   */
  private formatStatus(agentName: string, status: string): string {
    const capitalizedAgent = agentName.charAt(0).toUpperCase() + agentName.slice(1);
    return `${capitalizedAgent}: ${status}`;
  }
}
