/**
 * Result Formatter - formats delegation results with consistent styling
 */
import { DELEGATION_RESULT_PREFIX, DELEGATION_ERROR_PREFIX } from '../../shared/constants/index.js';

/**
 * Formats delegation results and errors with consistent styling
 * for easy identification in agent output streams.
 */
export class ResultFormatter {
  private readonly separatorLength: number = 60;
  private readonly separatorChar: string = '=';

  /**
   * Format a delegation result
   * @param agent Agent name that produced the result
   * @param result Result content from the agent
   * @param success Whether the delegation was successful
   * @returns Formatted result string
   */
  format(agent: string, result: string, success: boolean): string {
    const prefix = success ? DELEGATION_RESULT_PREFIX : DELEGATION_ERROR_PREFIX;
    const separator = this.createSeparator(this.separatorLength);
    const content = this.wrapResult(result);

    return [
      '',
      prefix,
      `Agent: ${agent}`,
      separator,
      content,
      separator,
      ''
    ].join('\n');
  }

  /**
   * Format a delegation error
   * @param agent Agent name that encountered the error
   * @param error Error that occurred
   * @returns Formatted error string
   */
  formatError(agent: string, error: Error): string {
    const errorMessage = this.formatErrorMessage(error);
    return this.format(agent, errorMessage, false);
  }

  /**
   * Format a timeout error
   * @param agent Agent name that timed out
   * @param timeout Timeout duration in milliseconds
   * @returns Formatted timeout error string
   */
  formatTimeout(agent: string, timeout: number): string {
    const timeoutMessage = `Delegation timed out after ${this.formatDuration(timeout)}`;
    return this.format(agent, timeoutMessage, false);
  }

  /**
   * Format a depth limit error
   * @param agent Agent name that reached depth limit
   * @param maxDepth Maximum delegation depth
   * @returns Formatted depth error string
   */
  formatDepthError(agent: string, maxDepth: number): string {
    const depthMessage = `Maximum delegation depth of ${maxDepth} exceeded`;
    return this.format(agent, depthMessage, false);
  }

  /**
   * Create a separator line
   * @param length Length of the separator
   * @returns Separator string
   */
  private createSeparator(length: number): string {
    return this.separatorChar.repeat(length);
  }

  /**
   * Wrap result content, trimming excessive whitespace
   * @param content Content to wrap
   * @returns Wrapped content
   */
  private wrapResult(content: string): string {
    return content.trim();
  }

  /**
   * Format error message with stack trace if available
   * @param error Error object
   * @returns Formatted error message
   */
  private formatErrorMessage(error: Error): string {
    const parts: string[] = [error.message];

    if (error.stack) {
      parts.push('');
      parts.push('Stack trace:');
      parts.push(error.stack);
    }

    return parts.join('\n');
  }

  /**
   * Format duration in milliseconds to human-readable format
   * @param ms Duration in milliseconds
   * @returns Formatted duration string
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }

    return `${minutes}m ${remainingSeconds}s`;
  }
}
