/**
 * StreamRenderer - Rich rendering of streaming events
 * Provides visual feedback for thinking blocks, tool use, and progress
 */

import chalk from 'chalk';
import type {
  ExtractedEvent,
  ThinkingEvent,
  ToolUseEvent,
  ToolResultEvent,
  ProgressEvent,
  TextEvent
} from '../../shared/types/streaming.types.js';

/**
 * StreamRenderer configuration
 */
export interface StreamRendererConfig {
  enabled: boolean;
  showThinking: boolean;
  showToolUse: boolean;
  showProgress: boolean;
  indentSize: number;
  maxThinkingLength?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: StreamRendererConfig = {
  enabled: true,
  showThinking: true,
  showToolUse: true,
  showProgress: true,
  indentSize: 2,
  maxThinkingLength: 200
};

/**
 * StreamRenderer - Renders streaming events with rich formatting
 *
 * Provides specialized rendering for:
 * - Thinking blocks (with collapse/truncation)
 * - Tool use events (with formatted arguments)
 * - Tool results (with success/error indication)
 * - Progress indicators
 * - Plain text
 */
export class StreamRenderer {
  private config: StreamRendererConfig;

  /**
   * Create a new StreamRenderer
   * @param config - Optional configuration override
   */
  constructor(config?: Partial<StreamRendererConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
  }

  /**
   * Render a thinking block
   * @param text - Thinking content
   */
  renderThinking(text: string): void {
    if (!this.config.enabled || !this.config.showThinking) {
      return;
    }

    const icon = chalk.yellow('🤔');
    const label = chalk.yellow.bold('Thinking');

    console.log(`\n${icon} ${label}...`);

    // Truncate if too long
    let content = text;
    if (this.config.maxThinkingLength && text.length > this.config.maxThinkingLength) {
      content = text.substring(0, this.config.maxThinkingLength) + '...';
    }

    // Indent the content
    const indented = this.indent(content);
    console.log(chalk.gray(indented));
  }

  /**
   * Render a tool use event
   * @param tool - Tool name
   * @param args - Tool arguments
   */
  renderToolUse(tool: string, args: Record<string, unknown>): void {
    if (!this.config.enabled || !this.config.showToolUse) {
      return;
    }

    const icon = chalk.cyan('🔧');
    const label = chalk.cyan.bold('Using Tool');
    const toolName = chalk.cyan(tool);

    console.log(`\n${icon} ${label}: ${toolName}`);

    // Show formatted arguments if present
    if (Object.keys(args).length > 0) {
      const formatted = this.formatArgs(args);
      console.log(chalk.gray(formatted));
    }
  }

  /**
   * Render a tool result event
   * @param tool - Tool name
   * @param output - Tool output
   * @param isError - Whether this is an error result
   */
  renderToolResult(tool: string, output: string, isError: boolean = false): void {
    if (!this.config.enabled || !this.config.showToolUse) {
      return;
    }

    if (isError) {
      const icon = chalk.red('✗');
      const label = chalk.red.bold('Tool Error');
      const toolName = chalk.red(tool);

      console.log(`\n${icon} ${label}: ${toolName}`);
      console.log(chalk.red(this.indent(output)));
    } else {
      const icon = chalk.green('✓');
      const label = chalk.green.bold('Tool Result');
      const toolName = chalk.green(tool);

      console.log(`\n${icon} ${label}: ${toolName}`);
      console.log(chalk.gray(this.indent(output)));
    }
  }

  /**
   * Render a progress indicator
   * @param percentage - Progress percentage (0-100)
   * @param label - Progress label
   */
  renderProgress(percentage: number, label: string): void {
    if (!this.config.enabled || !this.config.showProgress) {
      return;
    }

    const width = 20;
    // Clamp percentage to 0-100 range
    const clampedPercentage = Math.min(100, Math.max(0, percentage));
    const filled = Math.floor((clampedPercentage / 100) * width);
    const empty = width - filled;

    const bar = chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    const percent = chalk.cyan(`${Math.floor(clampedPercentage)}%`);
    const labelText = chalk.gray(label);

    process.stdout.write(`\r⚡ ${labelText}: [${bar}] ${percent}`);

    if (clampedPercentage >= 100) {
      console.log('');
    }
  }

  /**
   * Render a generic event
   * @param event - Event to render
   */
  renderEvent(event: ExtractedEvent): void {
    if (!this.config.enabled) {
      return;
    }

    switch (event.type) {
      case 'thinking':
        this.renderThinking((event as ThinkingEvent).content);
        break;

      case 'tool_use': {
        const toolEvent = event as ToolUseEvent;
        this.renderToolUse(toolEvent.toolName, toolEvent.input);
        break;
      }

      case 'tool_result': {
        const resultEvent = event as ToolResultEvent;
        this.renderToolResult(resultEvent.toolName, resultEvent.output, resultEvent.isError);
        break;
      }

      case 'progress': {
        const progressEvent = event as ProgressEvent;
        const percentage = (progressEvent.current / progressEvent.total) * 100;
        this.renderProgress(percentage, progressEvent.label);
        break;
      }

      case 'text': {
        const textEvent = event as TextEvent;
        this.renderText(textEvent.content);
        break;
      }

      default:
        // Unknown event type, render as text if it has content
        if ('content' in event && typeof (event as any).content === 'string') {
          this.renderText((event as any).content);
        }
    }
  }

  /**
   * Render multiple events
   * @param events - Array of events to render
   */
  renderEvents(events: ExtractedEvent[]): void {
    for (const event of events) {
      this.renderEvent(event);
    }
  }

  /**
   * Render plain text
   * @param text - Text to render
   */
  renderText(text: string): void {
    if (!this.config.enabled) {
      return;
    }

    if (text.trim()) {
      console.log(text);
    }
  }

  /**
   * Update renderer configuration
   * @param config - Partial configuration to merge
   */
  updateConfig(config: Partial<StreamRendererConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Get current configuration
   * @returns Current renderer configuration
   */
  getConfig(): StreamRendererConfig {
    return { ...this.config };
  }

  /**
   * Indent text for nested display
   * @param text - Text to indent
   * @returns Indented text
   */
  private indent(text: string): string {
    const spaces = ' '.repeat(this.config.indentSize);
    return text
      .split('\n')
      .map(line => spaces + line)
      .join('\n');
  }

  /**
   * Format arguments for display
   * @param args - Arguments object
   * @returns Formatted string
   */
  private formatArgs(args: Record<string, unknown>): string {
    const formatted: string[] = [];

    for (const [key, value] of Object.entries(args)) {
      const keyStr = chalk.cyan(key);
      let valueStr: string;

      if (typeof value === 'object' && value !== null) {
        valueStr = chalk.white(JSON.stringify(value, null, 2));
      } else {
        valueStr = chalk.white(String(value));
      }

      formatted.push(`  ${keyStr}: ${valueStr}`);
    }

    return formatted.join('\n');
  }
}
