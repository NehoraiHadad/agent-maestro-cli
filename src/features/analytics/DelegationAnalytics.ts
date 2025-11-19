/**
 * DelegationAnalytics - Track and analyze delegation patterns and performance
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type {
  DelegationEvent,
  DelegationStats,
  DelegationPattern,
  AnalyticsReport,
} from '../../shared/types/delegation.types.js';

export interface DelegationAnalyticsOptions {
  /** Base directory for analytics storage */
  baseDir?: string;
  /** Maximum number of events to keep in memory */
  maxEvents?: number;
  /** Enable auto-save */
  autoSave?: boolean;
}

/**
 * DelegationAnalytics - Track delegation events and calculate metrics
 */
export class DelegationAnalytics {
  private events: DelegationEvent[] = [];
  private baseDir: string;
  private eventsFile: string;
  private maxEvents: number;
  private autoSave: boolean;

  constructor(options: DelegationAnalyticsOptions = {}) {
    this.baseDir = options.baseDir || join(homedir(), '.maestro', 'analytics');
    this.eventsFile = join(this.baseDir, 'delegation-events.json');
    this.maxEvents = options.maxEvents || 10000;
    this.autoSave = options.autoSave ?? true;
  }

  /**
   * Initialize analytics storage
   */
  async initialize(): Promise<void> {
    await this.ensureDirectory();
    await this.loadEvents();
  }

  /**
   * Ensure analytics directory exists
   */
  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  /**
   * Track a delegation event
   */
  async track(delegation: DelegationEvent): Promise<void> {
    this.events.push(delegation);

    // Trim events if exceeding max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    if (this.autoSave) {
      await this.saveEvents();
    }
  }

  /**
   * Get delegation statistics
   */
  getStats(): DelegationStats {
    const totalDelegations = this.events.length;

    if (totalDelegations === 0) {
      return {
        totalDelegations: 0,
        byAgent: {},
        avgDuration: 0,
        successRate: 0,
        commonPatterns: [],
      };
    }

    // Calculate by-agent statistics
    const byAgent: Record<string, number> = {};
    let totalDuration = 0;
    let successCount = 0;
    let completedCount = 0;

    for (const event of this.events) {
      // Count by agent
      byAgent[event.to] = (byAgent[event.to] || 0) + 1;

      // Track success
      if (event.success !== undefined) {
        completedCount++;
        if (event.success) {
          successCount++;
        }
      }

      // Track duration
      if (event.duration) {
        totalDuration += event.duration;
      }
    }

    const avgDuration = totalDuration / totalDelegations;
    const successRate = completedCount > 0 ? successCount / completedCount : 0;

    // Identify common patterns
    const commonPatterns = this.identifyPatterns();

    return {
      totalDelegations,
      byAgent,
      avgDuration,
      successRate,
      commonPatterns,
    };
  }

  /**
   * Identify delegation patterns
   */
  private identifyPatterns(): DelegationPattern[] {
    const patterns = new Map<string, {
      agents: Set<string>;
      count: number;
      totalDuration: number;
      successCount: number;
      totalCompleted: number;
    }>();

    for (const event of this.events) {
      // Create pattern key from task keywords
      const keywords = this.extractKeywords(event.task);
      const patternKey = keywords.slice(0, 3).join(' ');

      if (!patternKey) continue;

      const pattern = patterns.get(patternKey) || {
        agents: new Set<string>(),
        count: 0,
        totalDuration: 0,
        successCount: 0,
        totalCompleted: 0,
      };

      pattern.agents.add(event.to);
      pattern.count++;

      if (event.duration) {
        pattern.totalDuration += event.duration;
      }

      if (event.success !== undefined) {
        pattern.totalCompleted++;
        if (event.success) {
          pattern.successCount++;
        }
      }

      patterns.set(patternKey, pattern);
    }

    // Convert to array and sort by count
    const result: DelegationPattern[] = Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        agents: Array.from(data.agents),
        avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
        successRate: data.totalCompleted > 0 ? data.successCount / data.totalCompleted : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 patterns

    return result;
  }

  /**
   * Extract keywords from task description
   */
  private extractKeywords(task: string): string[] {
    // Remove common words and extract meaningful terms
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'with', 'from', 'by', 'this', 'that', 'is', 'are', 'was', 'were',
      'can', 'could', 'should', 'would', 'will', 'please', 'help', 'me',
    ]);

    const words = task
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));

    return words;
  }

  /**
   * Generate analytics report
   */
  generateReport(timeRange?: { start: Date; end: Date }): AnalyticsReport {
    const stats = this.getStats();

    // Filter events by time range if provided
    const filteredEvents = timeRange
      ? this.events.filter(e => {
          const eventTime = e.timestamp;
          return eventTime >= timeRange.start.getTime() && eventTime <= timeRange.end.getTime();
        })
      : this.events;

    // Calculate top agents
    const agentStats = new Map<string, {
      count: number;
      successCount: number;
      totalCompleted: number;
      totalDuration: number;
    }>();

    for (const event of filteredEvents) {
      const agent = event.to;
      const agentData = agentStats.get(agent) || {
        count: 0,
        successCount: 0,
        totalCompleted: 0,
        totalDuration: 0,
      };

      agentData.count++;

      if (event.success !== undefined) {
        agentData.totalCompleted++;
        if (event.success) {
          agentData.successCount++;
        }
      }

      if (event.duration) {
        agentData.totalDuration += event.duration;
      }

      agentStats.set(agent, agentData);
    }

    const topAgents = Array.from(agentStats.entries())
      .map(([agent, data]) => ({
        agent,
        count: data.count,
        successRate: data.totalCompleted > 0 ? data.successCount / data.totalCompleted : 0,
        avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get recent delegations
    const recentDelegations = [...filteredEvents]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    // Determine time range
    const actualTimeRange = timeRange || {
      start: filteredEvents.length > 0
        ? new Date(Math.min(...filteredEvents.map(e => e.timestamp)))
        : new Date(),
      end: filteredEvents.length > 0
        ? new Date(Math.max(...filteredEvents.map(e => e.timestamp)))
        : new Date(),
    };

    return {
      generatedAt: new Date(),
      timeRange: actualTimeRange,
      stats,
      topAgents,
      recentDelegations,
    };
  }

  /**
   * Export analytics data
   */
  export(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return this.exportJSON();
    } else {
      return this.exportCSV();
    }
  }

  /**
   * Export to JSON format
   */
  private exportJSON(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export to CSV format
   */
  private exportCSV(): string {
    const headers = [
      'Timestamp',
      'From',
      'To',
      'Task',
      'Duration (ms)',
      'Success',
      'Error',
    ];

    const rows = this.events.map(event => [
      new Date(event.timestamp).toISOString(),
      event.from,
      event.to,
      `"${event.task.replace(/"/g, '""')}"`, // Escape quotes in CSV
      event.duration?.toString() || '',
      event.success !== undefined ? event.success.toString() : '',
      event.error ? `"${event.error.replace(/"/g, '""')}"` : '',
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Load events from storage
   */
  private async loadEvents(): Promise<void> {
    try {
      const data = await fs.readFile(this.eventsFile, 'utf-8');
      this.events = JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist yet, start with empty events
        this.events = [];
      } else {
        throw error;
      }
    }
  }

  /**
   * Save events to storage
   */
  private async saveEvents(): Promise<void> {
    await this.ensureDirectory();
    await fs.writeFile(this.eventsFile, JSON.stringify(this.events, null, 2), 'utf-8');
  }

  /**
   * Clear all events
   */
  async clear(): Promise<void> {
    this.events = [];
    await this.saveEvents();
  }

  /**
   * Get all events
   */
  getEvents(): DelegationEvent[] {
    return [...this.events];
  }

  /**
   * Get events by agent
   */
  getEventsByAgent(agent: string): DelegationEvent[] {
    return this.events.filter(e => e.to === agent);
  }

  /**
   * Get events by time range
   */
  getEventsByTimeRange(start: Date, end: Date): DelegationEvent[] {
    const startTime = start.getTime();
    const endTime = end.getTime();
    return this.events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
  }
}
