/**
 * ErrorReporter - Format and report errors with user-friendly messages
 */

import chalk from 'chalk';
import {
  ErrorContext,
  ErrorCategory,
  ErrorSeverity,
  CategorizedError,
  RecoverySuggestion
} from './types.js';
import { ErrorRecovery } from './ErrorRecovery.js';

export class ErrorReporter {
  private errorRecovery: ErrorRecovery;

  constructor() {
    this.errorRecovery = new ErrorRecovery();
  }

  /**
   * Report an error with full context and suggestions
   */
  report(error: Error, context?: ErrorContext): void {
    const analyzed = this.errorRecovery.analyze(error, context);
    const formatted = this.formatUserMessage(analyzed);
    console.error(formatted);
  }

  /**
   * Format error for user display with colors and suggestions
   */
  formatUserMessage(categorized: CategorizedError): string {
    const { error, category, severity, suggestions, isRetryable } = categorized;

    const lines: string[] = [];

    // Header with severity indicator
    lines.push('');
    lines.push(this.formatHeader(severity, category));
    lines.push('');

    // Error message
    lines.push(chalk.red('Error: ') + error.message);
    lines.push('');

    // Error code if available
    if ('code' in error && typeof error.code === 'string') {
      lines.push(chalk.gray(`Code: ${error.code}`));
      lines.push('');
    }

    // Retryable indicator
    if (isRetryable) {
      lines.push(chalk.yellow('⚡ This error may be temporary and retryable'));
      lines.push('');
    }

    // Recovery suggestions
    if (suggestions.length > 0) {
      lines.push(chalk.cyan('💡 Suggestions:'));
      suggestions.forEach((suggestion) => {
        const prefix = suggestion.automated ? '  [Auto]' : '  [Manual]';
        lines.push(chalk.cyan(prefix) + ' ' + chalk.white(suggestion.action));
        lines.push(chalk.gray(`    ${suggestion.description}`));
      });
      lines.push('');
    }

    // Context information if available
    if (categorized.context) {
      lines.push(chalk.gray('Context:'));
      if (categorized.context.operation) {
        lines.push(chalk.gray(`  Operation: ${categorized.context.operation}`));
      }
      if (categorized.context.agentName) {
        lines.push(chalk.gray(`  Agent: ${categorized.context.agentName}`));
      }
      if (categorized.context.sessionId) {
        lines.push(chalk.gray(`  Session: ${categorized.context.sessionId}`));
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format a simple error message (without full analysis)
   */
  formatSimpleMessage(error: Error): string {
    const category = this.errorRecovery.categorize(error);
    const severity = this.errorRecovery.getSeverity(error);

    const icon = this.getSeverityIcon(severity);
    const color = this.getSeverityColor(severity);

    return `${color(icon)} ${chalk.red(error.message)} ${chalk.gray(`[${category}]`)}`;
  }

  /**
   * Format error header with severity and category
   */
  private formatHeader(severity: ErrorSeverity, category: ErrorCategory): string {
    const icon = this.getSeverityIcon(severity);
    const color = this.getSeverityColor(severity);
    const severityText = color(`${icon} ${severity} ERROR`);
    const categoryText = chalk.gray(`[${category}]`);

    return `${severityText} ${categoryText}`;
  }

  /**
   * Get icon for severity level
   */
  private getSeverityIcon(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return '🚨';
      case ErrorSeverity.HIGH:
        return '⚠️';
      case ErrorSeverity.MEDIUM:
        return '⚡';
      case ErrorSeverity.LOW:
        return 'ℹ️';
      default:
        return '❌';
    }
  }

  /**
   * Get chalk color function for severity level
   */
  private getSeverityColor(severity: ErrorSeverity): typeof chalk {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return chalk.red.bold;
      case ErrorSeverity.HIGH:
        return chalk.red;
      case ErrorSeverity.MEDIUM:
        return chalk.yellow;
      case ErrorSeverity.LOW:
        return chalk.blue;
      default:
        return chalk.white;
    }
  }

  /**
   * Format suggestions for display
   */
  formatSuggestions(suggestions: RecoverySuggestion[]): string {
    if (suggestions.length === 0) {
      return '';
    }

    const lines: string[] = [chalk.cyan('💡 Suggestions:')];

    suggestions.forEach((suggestion) => {
      const prefix = suggestion.automated ? '  [Auto]' : '  [Manual]';
      lines.push(chalk.cyan(prefix) + ' ' + chalk.white(suggestion.action));
      lines.push(chalk.gray(`    ${suggestion.description}`));
    });

    return lines.join('\n');
  }

  /**
   * Log error to console with appropriate formatting
   */
  logError(error: Error, context?: ErrorContext): void {
    this.report(error, context);
  }

  /**
   * Create a user-friendly error summary
   */
  createSummary(error: Error): string {
    const category = this.errorRecovery.categorize(error);
    const severity = this.errorRecovery.getSeverity(error);

    let summary = `${severity} ${category} error: ${error.message}`;

    // Add helpful context based on category
    switch (category) {
      case ErrorCategory.NETWORK:
        summary += ' Check your network connection.';
        break;
      case ErrorCategory.AUTHENTICATION:
        summary += ' Verify your credentials.';
        break;
      case ErrorCategory.CONFIGURATION:
        summary += ' Check your configuration.';
        break;
      case ErrorCategory.FILE_SYSTEM:
        summary += ' Verify file permissions and paths.';
        break;
      case ErrorCategory.TIMEOUT:
        summary += ' The operation took too long.';
        break;
      case ErrorCategory.AGENT_EXECUTION:
        summary += ' Check agent installation and configuration.';
        break;
    }

    return summary;
  }

  /**
   * Check if error should be logged (filter noise)
   */
  shouldLog(error: Error): boolean {
    // Filter out some common non-critical errors
    const ignorePatterns = [
      /user cancelled/i,
      /user aborted/i,
      /sigint/i
    ];

    return !ignorePatterns.some(pattern => pattern.test(error.message));
  }
}
