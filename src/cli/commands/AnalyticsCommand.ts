/**
 * Analytics Command
 * View and export delegation analytics data
 */

import { Command } from 'commander';
import { ConsoleLogger } from '../../features/ui/index.js';
import { DelegationAnalytics } from '../../features/analytics/index.js';
import { promises as fs } from 'fs';
import chalk from 'chalk';

/**
 * AnalyticsCommand - handles delegation analytics viewing and export
 */
export class AnalyticsCommand {
  private static logger = new ConsoleLogger();
  private static analytics: DelegationAnalytics;

  /**
   * Register the analytics command with the CLI program
   */
  static register(program: Command): void {
    const analytics = program
      .command('analytics')
      .description('view and manage delegation analytics');

    // Show analytics report
    analytics
      .command('show')
      .description('display delegation analytics report')
      .option('-d, --days <number>', 'limit to last N days', '30')
      .option('-a, --agent <name>', 'filter by agent name')
      .action(async (options) => {
        await this.executeShow(options);
      });

    // Export analytics data
    analytics
      .command('export')
      .description('export analytics data')
      .requiredOption('-f, --format <format>', 'export format (json or csv)')
      .option('-o, --output <file>', 'output file path')
      .action(async (options) => {
        await this.executeExport(options);
      });

    // Clear analytics data
    analytics
      .command('clear')
      .description('clear all analytics data')
      .option('-y, --yes', 'skip confirmation')
      .action(async (options) => {
        await this.executeClear(options);
      });
  }

  /**
   * Initialize analytics instance
   */
  private static async getAnalytics(): Promise<DelegationAnalytics> {
    if (!this.analytics) {
      this.analytics = new DelegationAnalytics();
      await this.analytics.initialize();
    }
    return this.analytics;
  }

  /**
   * Execute show command - display analytics report
   */
  static async executeShow(options: { days?: string; agent?: string }): Promise<void> {
    try {
      const analytics = await this.getAnalytics();

      // Calculate time range
      const days = parseInt(options.days || '30', 10);
      const end = new Date();
      const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

      // Generate report
      const report = analytics.generateReport({ start, end });
      const stats = report.stats;

      // Display header
      this.logger.separator('=', 70);
      console.log(chalk.bold.cyan('📊 Delegation Analytics Report'));
      this.logger.separator('=', 70);
      console.log();

      // Time range
      console.log(chalk.bold('Time Range:'));
      console.log(`  ${chalk.gray(start.toLocaleDateString())} → ${chalk.gray(end.toLocaleDateString())} (${days} days)`);
      console.log();

      // Overall statistics
      console.log(chalk.bold('Overall Statistics:'));
      console.log(`  Total Delegations: ${chalk.cyan(stats.totalDelegations)}`);
      console.log(`  Average Duration: ${chalk.cyan(this.formatDuration(stats.avgDuration))}`);
      console.log(`  Success Rate: ${this.formatSuccessRate(stats.successRate)}`);
      console.log();

      // By agent
      if (Object.keys(stats.byAgent).length > 0) {
        console.log(chalk.bold('Delegations by Agent:'));
        const sortedAgents = Object.entries(stats.byAgent)
          .sort(([, a], [, b]) => b - a);

        for (const [agent, count] of sortedAgents) {
          const percentage = stats.totalDelegations > 0
            ? ((count / stats.totalDelegations) * 100).toFixed(1)
            : '0.0';
          console.log(`  ${chalk.cyan(agent.padEnd(20))} ${count.toString().padStart(3)} (${percentage}%)`);
        }
        console.log();
      }

      // Top agents with details
      if (report.topAgents.length > 0) {
        console.log(chalk.bold('Top Performing Agents:'));
        for (const agentData of report.topAgents.slice(0, 5)) {
          console.log(`  ${chalk.cyan(agentData.agent)}`);
          console.log(`    Delegations: ${agentData.count}`);
          console.log(`    Success Rate: ${this.formatSuccessRate(agentData.successRate)}`);
          console.log(`    Avg Duration: ${this.formatDuration(agentData.avgDuration)}`);
        }
        console.log();
      }

      // Common patterns
      if (stats.commonPatterns.length > 0) {
        console.log(chalk.bold('Common Delegation Patterns:'));
        for (let i = 0; i < Math.min(5, stats.commonPatterns.length); i++) {
          const pattern = stats.commonPatterns[i];
          console.log(`  ${chalk.yellow(`${i + 1}.`)} ${chalk.cyan(pattern.pattern)} (${pattern.count} times)`);
          console.log(`     Agents: ${pattern.agents.join(', ')}`);
          console.log(`     Success Rate: ${this.formatSuccessRate(pattern.successRate)}`);
        }
        console.log();
      }

      // Recent delegations
      if (report.recentDelegations.length > 0) {
        console.log(chalk.bold('Recent Delegations:'));
        for (const delegation of report.recentDelegations.slice(0, 5)) {
          const status = delegation.success === true
            ? chalk.green('✓')
            : delegation.success === false
            ? chalk.red('✗')
            : chalk.gray('○');
          const duration = delegation.duration ? this.formatDuration(delegation.duration) : 'N/A';
          const time = new Date(delegation.timestamp).toLocaleString();
          console.log(`  ${status} ${chalk.cyan(delegation.to.padEnd(15))} ${chalk.gray(time)}`);
          console.log(`    Duration: ${duration}`);
          console.log(`    Task: ${chalk.gray(this.truncate(delegation.task, 60))}`);
        }
        console.log();
      }

      this.logger.separator('=', 70);

    } catch (error) {
      this.logger.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  /**
   * Execute export command - export analytics data
   */
  static async executeExport(options: { format: string; output?: string }): Promise<void> {
    try {
      const analytics = await this.getAnalytics();

      // Validate format
      const format = options.format.toLowerCase();
      if (format !== 'json' && format !== 'csv') {
        this.logger.error('\n❌ Invalid format. Use "json" or "csv".');
        process.exit(1);
      }

      // Export data
      const data = analytics.export(format as 'json' | 'csv');

      // Write to file or stdout
      if (options.output) {
        await fs.writeFile(options.output, data, 'utf-8');
        this.logger.success(`\n✓ Analytics exported to ${options.output}`);
      } else {
        console.log(data);
      }

    } catch (error) {
      this.logger.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  /**
   * Execute clear command - clear analytics data
   */
  static async executeClear(options: { yes?: boolean }): Promise<void> {
    try {
      const analytics = await this.getAnalytics();

      // Confirm if not using -y flag
      if (!options.yes) {
        console.log(chalk.yellow('\n⚠️  This will delete all analytics data.'));
        console.log('Use --yes flag to confirm, or Ctrl+C to cancel.\n');
        process.exit(1);
      }

      // Clear analytics
      await analytics.clear();
      this.logger.success('\n✓ Analytics data cleared successfully.');

    } catch (error) {
      this.logger.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  private static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Format success rate as percentage with color
   */
  private static formatSuccessRate(rate: number): string {
    const percentage = (rate * 100).toFixed(1);
    const color = rate >= 0.8 ? chalk.green : rate >= 0.5 ? chalk.yellow : chalk.red;
    return color(`${percentage}%`);
  }

  /**
   * Truncate string to max length
   */
  private static truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + '...';
  }
}
