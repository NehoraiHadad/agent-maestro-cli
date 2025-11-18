/**
 * StatusUpdater.ts
 * Updates spinner based on agent status changes
 */

import { Spinner } from './Spinner.js';

/**
 * Manages spinner updates based on agent activity
 */
export class StatusUpdater {
  private spinner: Spinner | null = null;
  private lastStatus: string = '';

  /**
   * Create a new StatusUpdater
   * @param spinner - Optional spinner instance to manage
   */
  constructor(spinner?: Spinner) {
    this.spinner = spinner || null;
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

    // Skip redundant updates
    if (!this.shouldUpdate(status)) {
      return;
    }

    const formattedStatus = this.formatStatus(agentName, status);
    this.spinner.update(formattedStatus, color);
    this.lastStatus = status;
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
