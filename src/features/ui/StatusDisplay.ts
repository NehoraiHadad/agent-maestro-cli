/**
 * StatusDisplay.ts
 * Enhanced status display with session headers, progress bars, and rich formatting
 */

import chalk from 'chalk';
import type {
  SessionInfo,
  StatusInfo,
  ProgressConfig,
  StatusDisplayConfig,
  StatusDisplayTheme,
  ChalkColorMethod
} from '../../shared/types/ui.types.js';

/**
 * Default theme for status display
 */
const DEFAULT_THEME: StatusDisplayTheme = {
  borderColor: 'cyan',
  headerColor: 'magenta',
  accentColor: 'cyan',
  labelColor: 'gray',
  valueColor: 'white',
  progressBarFilled: '█',
  progressBarEmpty: '░',
  progressBarColor: 'cyan'
};

/**
 * Default configuration for status display
 */
const DEFAULT_CONFIG: StatusDisplayConfig = {
  enabled: true,
  showHeader: true,
  showProgress: true,
  headerWidth: 60,
  theme: DEFAULT_THEME
};

/**
 * StatusDisplay - Enhanced status display with rich formatting
 *
 * Provides session headers, progress bars, and status messages
 * with customizable themes and visual hierarchy
 */
export class StatusDisplay {
  private config: StatusDisplayConfig;

  /**
   * Create a new StatusDisplay
   * @param config - Optional configuration override
   */
  constructor(config?: Partial<StatusDisplayConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      theme: {
        ...DEFAULT_THEME,
        ...(config?.theme || {})
      }
    };
  }

  /**
   * Display session header with info
   * @param session - Session information to display
   */
  showSessionHeader(session: SessionInfo): void {
    if (!this.config.enabled || !this.config.showHeader) {
      return;
    }

    const width = this.config.headerWidth;
    const theme = this.config.theme;

    // Build header content
    const title = '🎭 AgentMaestro - Claude Code Wrapper';
    const sessionLine = this.buildInfoLine('Session', session.sessionId || 'new', width - 4);
    const modeLine = this.buildInfoLine('Mode', this.formatMode(session), width - 4);
    const statsLine = this.buildInfoLine(
      'Messages',
      `${session.messageCount} | Duration: ${this.formatDuration(session.duration)}`,
      width - 4
    );

    // Build header box
    const topBorder = this.colorize('╔' + '═'.repeat(width - 2) + '╗', theme.borderColor);
    const bottomBorder = this.colorize('╚' + '═'.repeat(width - 2) + '╝', theme.borderColor);

    const titleLine = this.buildBoxLine(
      this.colorize(title, theme.headerColor, true),
      width
    );

    console.log('');
    console.log(topBorder);
    console.log(titleLine);
    console.log(sessionLine);
    console.log(modeLine);
    console.log(statsLine);
    console.log(bottomBorder);
    console.log('');
  }

  /**
   * Display progress bar for long operations
   * @param config - Progress bar configuration
   */
  showProgress(config: ProgressConfig): void {
    if (!this.config.enabled || !this.config.showProgress) {
      return;
    }

    const width = config.width || 40;
    const percentage = Math.min(100, Math.max(0, (config.current / config.total) * 100));
    const filledWidth = Math.floor((percentage / 100) * width);
    const emptyWidth = width - filledWidth;

    const theme = this.config.theme;
    const filled = this.colorize(
      theme.progressBarFilled.repeat(filledWidth),
      theme.progressBarColor
    );
    const empty = theme.progressBarEmpty.repeat(emptyWidth);

    const percentageText = config.showPercentage !== false
      ? ` ${Math.floor(percentage)}%`
      : '';

    const label = this.colorize(config.label, theme.labelColor);

    console.log(`${label}: [${filled}${empty}]${percentageText}`);
  }

  /**
   * Update progress bar in place (single line)
   * @param config - Progress bar configuration
   */
  updateProgress(config: ProgressConfig): void {
    if (!this.config.enabled || !this.config.showProgress) {
      return;
    }

    const width = config.width || 40;
    const percentage = Math.min(100, Math.max(0, (config.current / config.total) * 100));
    const filledWidth = Math.floor((percentage / 100) * width);
    const emptyWidth = width - filledWidth;

    const theme = this.config.theme;
    const filled = this.colorize(
      theme.progressBarFilled.repeat(filledWidth),
      theme.progressBarColor
    );
    const empty = theme.progressBarEmpty.repeat(emptyWidth);

    const percentageText = config.showPercentage !== false
      ? ` ${Math.floor(percentage)}%`
      : '';

    const label = this.colorize(config.label, theme.labelColor);

    // Use carriage return to update same line
    process.stdout.write(`\r${label}: [${filled}${empty}]${percentageText}`);

    // Add newline when complete
    if (config.current >= config.total) {
      console.log('');
    }
  }

  /**
   * Display status message
   * @param status - Status information to display
   */
  showStatus(status: StatusInfo): void {
    if (!this.config.enabled) {
      return;
    }

    const icon = this.getStatusIcon(status.type);
    const color = this.getStatusColor(status.type);
    const message = this.colorize(`${icon} ${status.message}`, color);

    console.log(message);

    if (status.details) {
      const details = this.colorize(`  ${status.details}`, this.config.theme.labelColor);
      console.log(details);
    }
  }

  /**
   * Display a separator line
   */
  showSeparator(): void {
    if (!this.config.enabled) {
      return;
    }

    const separator = this.colorize(
      '─'.repeat(this.config.headerWidth),
      this.config.theme.borderColor
    );
    console.log(separator);
  }

  /**
   * Update configuration
   * @param config - Partial configuration to merge
   */
  updateConfig(config: Partial<StatusDisplayConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      theme: {
        ...this.config.theme,
        ...(config.theme || {})
      }
    };
  }

  /**
   * Get current configuration
   * @returns Current status display configuration
   */
  getConfig(): StatusDisplayConfig {
    return { ...this.config };
  }

  /**
   * Build a box line with borders
   */
  private buildBoxLine(content: string, width: number): string {
    const theme = this.config.theme;
    // Strip ANSI codes to calculate actual content length
    const contentLength = this.stripAnsi(content).length;
    const padding = Math.max(0, width - 4 - contentLength);
    const paddingLeft = Math.floor(padding / 2);
    const paddingRight = padding - paddingLeft;

    return (
      this.colorize('║', theme.borderColor) +
      ' '.repeat(paddingLeft + 1) +
      content +
      ' '.repeat(paddingRight + 1) +
      this.colorize('║', theme.borderColor)
    );
  }

  /**
   * Build an info line with label and value
   */
  private buildInfoLine(label: string, value: string, contentWidth: number): string {
    const theme = this.config.theme;
    const labelText = this.colorize(label, theme.labelColor);
    const valueText = this.colorize(value, theme.valueColor);
    const separator = this.colorize(': ', theme.accentColor);

    const plainLabel = label;
    const plainValue = value;
    const plainSeparator = ': ';

    const contentLength = plainLabel.length + plainSeparator.length + plainValue.length;
    const padding = Math.max(0, contentWidth - contentLength);

    const content = labelText + separator + valueText + ' '.repeat(padding);

    return this.buildBoxLine(content, this.config.headerWidth);
  }

  /**
   * Format session mode for display
   */
  private formatMode(session: SessionInfo): string {
    const mode = session.mode;
    const planMode = session.planMode ? ' (Plan Mode)' : '';
    return `${mode}${planMode}`;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get icon for status type
   */
  private getStatusIcon(type: StatusInfo['type']): string {
    const icons = {
      info: 'ℹ',
      success: '✓',
      warning: '⚠',
      error: '✗'
    };
    return icons[type];
  }

  /**
   * Get color for status type
   */
  private getStatusColor(type: StatusInfo['type']): ChalkColorMethod {
    const colors: Record<StatusInfo['type'], ChalkColorMethod> = {
      info: 'cyan',
      success: 'green',
      warning: 'yellow',
      error: 'red'
    };
    return colors[type];
  }

  /**
   * Colorize text with chalk
   */
  private colorize(text: string, color: ChalkColorMethod, bold = false): string {
    const chalkColor = chalk[color];
    return bold ? chalkColor.bold(text) : chalkColor(text);
  }

  /**
   * Strip ANSI escape codes from string
   */
  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }
}
