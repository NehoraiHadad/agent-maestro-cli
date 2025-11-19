/**
 * StreamRenderer - Rich rendering of streaming events
 * Handles visual display of thinking blocks, tool use, progress indicators, etc.
 */

import chalk from 'chalk';
import type {
  EnhancedStreamEvent,
  ThinkingEvent,
  ToolUseEvent,
  ToolResultEvent,
  ProgressEvent,
  TextEvent,
  ErrorEvent
} from '../../shared/types/streaming.types.js';

/**
 * Configuration for stream rendering
 */
export interface StreamRendererOptions {
  /** Enable thinking block display */
  showThinking?: boolean;
  /** Enable tool use display */
  showToolUse?: boolean;
  /** Enable progress indicators */
  showProgress?: boolean;
  /** Enable verbose mode */
  verbose?: boolean;
}

/**
 * Rich renderer for streaming events
 * Provides visual feedback for different event types during streaming
 */
export class StreamRenderer {
  private options: Required<StreamRendererOptions>;
  private currentProgress: Map<string, number> = new Map();

  constructor(options: StreamRendererOptions = {}) {
    this.options = {
      showThinking: options.showThinking ?? true,
      showToolUse: options.showToolUse ?? true,
      showProgress: options.showProgress ?? true,
      verbose: options.verbose ?? false
    };
  }

  /**
   * Render a single event
   * @param event - The event to render
   */
  renderEvent(event: EnhancedStreamEvent): void {
    switch (event.type) {
      case 'thinking':
        this.renderThinking(event);
        break;
      case 'tool_use':
        this.renderToolUse(event);
        break;
      case 'tool_result':
        this.renderToolResult(event);
        break;
      case 'progress':
        this.renderProgress(event);
        break;
      case 'text':
        this.renderText(event);
        break;
      case 'error':
        this.renderError(event);
        break;
    }
  }

  /**
   * Render multiple events
   * @param events - Array of events to render
   */
  renderEvents(events: EnhancedStreamEvent[]): void {
    for (const event of events) {
      this.renderEvent(event);
    }
  }

  /**
   * Render thinking block
   * @param event - Thinking event
   */
  private renderThinking(event: ThinkingEvent): void {
    if (!this.options.showThinking) {
      return;
    }

    const lines = event.content.split('\n');

    // Header
    console.log(chalk.cyan.bold('🤔 Thinking...'));

    // Content with indentation
    for (const line of lines) {
      if (line.trim()) {
        console.log(chalk.gray('  ' + line));
      }
    }
    console.log('');
  }

  /**
   * Render tool use event
   * @param event - Tool use event
   */
  private renderToolUse(event: ToolUseEvent): void {
    if (!this.options.showToolUse) {
      return;
    }

    console.log(chalk.yellow.bold(`🔧 Using Tool: ${event.toolName}`));

    if (this.options.verbose && Object.keys(event.args).length > 0) {
      for (const [key, value] of Object.entries(event.args)) {
        const displayValue = this.formatValue(value);
        console.log(chalk.gray(`  ${key}: ${displayValue}`));
      }
    }
    console.log('');
  }

  /**
   * Render tool result event
   * @param event - Tool result event
   */
  private renderToolResult(event: ToolResultEvent): void {
    if (!this.options.showToolUse) {
      return;
    }

    if (event.isError) {
      console.log(chalk.red.bold(`✗ Tool Failed: ${event.toolName}`));
      if (event.result && this.options.verbose) {
        console.log(chalk.gray(`  ${event.result.substring(0, 100)}...`));
      }
    } else {
      console.log(chalk.green.bold(`✓ Tool Completed: ${event.toolName}`));
      if (event.result && this.options.verbose) {
        const preview = event.result.substring(0, 100);
        console.log(chalk.gray(`  ${preview}${event.result.length > 100 ? '...' : ''}`));
      }
    }
    console.log('');
  }

  /**
   * Render progress indicator
   * @param event - Progress event
   */
  private renderProgress(event: ProgressEvent): void {
    if (!this.options.showProgress) {
      return;
    }

    // Update stored progress
    this.currentProgress.set(event.label, event.percentage);

    // Create progress bar
    const barLength = 20;
    const filledLength = Math.round((event.percentage / 100) * barLength);
    const emptyLength = barLength - filledLength;
    const bar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);

    // Format percentage
    const percentText = `${event.percentage.toFixed(0)}%`;

    // Render with color based on progress
    const colorFn = this.getProgressColor(event.percentage);
    console.log(colorFn(`⚡ ${event.label}: [${bar}] ${percentText}`));
  }

  /**
   * Render text event
   * @param event - Text event
   */
  private renderText(event: TextEvent): void {
    // Plain text output
    process.stdout.write(event.content);
  }

  /**
   * Render error event
   * @param event - Error event
   */
  private renderError(event: ErrorEvent): void {
    console.log(chalk.red.bold(`❌ Error: ${event.message}`));
    console.log('');
  }

  /**
   * Render a custom thinking block with text
   * @param text - Thinking text to display
   */
  renderThinkingBlock(text: string): void {
    this.renderThinking({
      type: 'thinking',
      content: text,
      timestamp: Date.now()
    });
  }

  /**
   * Render a custom tool use
   * @param toolName - Name of the tool
   * @param args - Tool arguments
   */
  renderToolUseBlock(toolName: string, args: Record<string, unknown>): void {
    this.renderToolUse({
      type: 'tool_use',
      toolName,
      args,
      timestamp: Date.now()
    });
  }

  /**
   * Render a custom progress indicator
   * @param percentage - Progress percentage (0-100)
   * @param label - Progress label
   */
  renderProgressBar(percentage: number, label: string): void {
    this.renderProgress({
      type: 'progress',
      percentage: Math.max(0, Math.min(100, percentage)),
      label,
      timestamp: Date.now()
    });
  }

  /**
   * Clear current progress indicators
   */
  clearProgress(): void {
    this.currentProgress.clear();
  }

  /**
   * Get progress color based on percentage
   * @param percentage - Progress percentage
   * @returns Chalk color function
   */
  private getProgressColor(percentage: number): (text: string) => string {
    if (percentage < 33) {
      return chalk.red;
    } else if (percentage < 66) {
      return chalk.yellow;
    } else {
      return chalk.green;
    }
  }

  /**
   * Format a value for display
   * @param value - Value to format
   * @returns Formatted string
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return chalk.gray('null');
    }

    if (typeof value === 'string') {
      // Truncate long strings
      if (value.length > 50) {
        return `"${value.substring(0, 47)}..."`;
      }
      return `"${value}"`;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 0).substring(0, 50) + '...';
    }

    return String(value);
  }

  /**
   * Update renderer options
   * @param options - New options to merge
   */
  setOptions(options: Partial<StreamRendererOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   * @returns Current renderer options
   */
  getOptions(): StreamRendererOptions {
    return { ...this.options };
  }
}
