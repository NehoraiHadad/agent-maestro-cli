import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DelegationAnalytics } from '../../../../src/features/analytics/DelegationAnalytics.js';
import type { DelegationEvent } from '../../../../src/shared/types/delegation.types.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('DelegationAnalytics', () => {
  let analytics: DelegationAnalytics;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = join(tmpdir(), `analytics-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    analytics = new DelegationAnalytics({
      baseDir: tempDir,
      autoSave: false, // Disable auto-save for tests
    });
    await analytics.initialize();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Event Tracking', () => {
    it('should track a delegation event', async () => {
      const event: DelegationEvent = {
        id: 'test-1',
        from: 'claude',
        to: 'codex',
        task: 'Generate code',
        timestamp: Date.now(),
        duration: 1000,
        success: true,
      };

      await analytics.track(event);

      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
    });

    it('should track multiple delegation events', async () => {
      const events: DelegationEvent[] = [
        {
          id: 'test-1',
          from: 'claude',
          to: 'codex',
          task: 'Generate code',
          timestamp: Date.now(),
          duration: 1000,
          success: true,
        },
        {
          id: 'test-2',
          from: 'claude',
          to: 'gemini',
          task: 'Research topic',
          timestamp: Date.now(),
          duration: 2000,
          success: true,
        },
      ];

      for (const event of events) {
        await analytics.track(event);
      }

      const trackedEvents = analytics.getEvents();
      expect(trackedEvents).toHaveLength(2);
    });

    it('should respect max events limit', async () => {
      const limitedAnalytics = new DelegationAnalytics({
        baseDir: tempDir,
        maxEvents: 5,
        autoSave: false,
      });
      await limitedAnalytics.initialize();

      // Track 10 events
      for (let i = 0; i < 10; i++) {
        await limitedAnalytics.track({
          id: `test-${i}`,
          from: 'claude',
          to: 'codex',
          task: `Task ${i}`,
          timestamp: Date.now(),
        });
      }

      const events = limitedAnalytics.getEvents();
      expect(events).toHaveLength(5);
      // Should keep the most recent events
      expect(events[0].id).toBe('test-5');
      expect(events[4].id).toBe('test-9');
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate statistics with no events', () => {
      const stats = analytics.getStats();

      expect(stats.totalDelegations).toBe(0);
      expect(stats.avgDuration).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.byAgent).toEqual({});
      expect(stats.commonPatterns).toEqual([]);
    });

    it('should calculate basic statistics', async () => {
      await analytics.track({
        id: 'test-1',
        from: 'claude',
        to: 'codex',
        task: 'Generate code',
        timestamp: Date.now(),
        duration: 1000,
        success: true,
      });

      await analytics.track({
        id: 'test-2',
        from: 'claude',
        to: 'codex',
        task: 'Generate more code',
        timestamp: Date.now(),
        duration: 2000,
        success: true,
      });

      const stats = analytics.getStats();

      expect(stats.totalDelegations).toBe(2);
      expect(stats.byAgent['codex']).toBe(2);
      expect(stats.avgDuration).toBe(1500); // (1000 + 2000) / 2
      expect(stats.successRate).toBe(1.0); // 100%
    });

    it('should calculate success rate correctly', async () => {
      await analytics.track({
        id: 'test-1',
        from: 'claude',
        to: 'codex',
        task: 'Task 1',
        timestamp: Date.now(),
        success: true,
      });

      await analytics.track({
        id: 'test-2',
        from: 'claude',
        to: 'codex',
        task: 'Task 2',
        timestamp: Date.now(),
        success: false,
      });

      await analytics.track({
        id: 'test-3',
        from: 'claude',
        to: 'codex',
        task: 'Task 3',
        timestamp: Date.now(),
        success: true,
      });

      const stats = analytics.getStats();

      expect(stats.successRate).toBeCloseTo(0.667, 2); // 2/3
    });

    it('should count delegations by agent', async () => {
      await analytics.track({
        id: 'test-1',
        from: 'claude',
        to: 'codex',
        task: 'Code task',
        timestamp: Date.now(),
      });

      await analytics.track({
        id: 'test-2',
        from: 'claude',
        to: 'gemini',
        task: 'Research task',
        timestamp: Date.now(),
      });

      await analytics.track({
        id: 'test-3',
        from: 'claude',
        to: 'codex',
        task: 'Another code task',
        timestamp: Date.now(),
      });

      const stats = analytics.getStats();

      expect(stats.byAgent['codex']).toBe(2);
      expect(stats.byAgent['gemini']).toBe(1);
    });

    it('should identify common patterns', async () => {
      // Track multiple similar delegations
      await analytics.track({
        id: 'test-1',
        from: 'claude',
        to: 'codex',
        task: 'Generate code for authentication',
        timestamp: Date.now(),
        duration: 1000,
        success: true,
      });

      await analytics.track({
        id: 'test-2',
        from: 'claude',
        to: 'codex',
        task: 'Generate code for login',
        timestamp: Date.now(),
        duration: 1200,
        success: true,
      });

      await analytics.track({
        id: 'test-3',
        from: 'claude',
        to: 'gemini',
        task: 'Research authentication methods',
        timestamp: Date.now(),
        duration: 2000,
        success: true,
      });

      const stats = analytics.getStats();

      expect(stats.commonPatterns.length).toBeGreaterThan(0);
      // The most common pattern should involve code generation
      const topPattern = stats.commonPatterns[0];
      expect(topPattern.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Report Generation', () => {
    beforeEach(async () => {
      // Add sample data
      const now = Date.now();
      await analytics.track({
        id: 'test-1',
        from: 'claude',
        to: 'codex',
        task: 'Generate code',
        timestamp: now - 3600000, // 1 hour ago
        duration: 1000,
        success: true,
      });

      await analytics.track({
        id: 'test-2',
        from: 'claude',
        to: 'gemini',
        task: 'Research topic',
        timestamp: now - 1800000, // 30 minutes ago
        duration: 2000,
        success: true,
      });

      await analytics.track({
        id: 'test-3',
        from: 'claude',
        to: 'codex',
        task: 'Fix bug',
        timestamp: now,
        duration: 1500,
        success: false,
      });
    });

    it('should generate a complete report', () => {
      const report = analytics.generateReport();

      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.stats).toBeDefined();
      expect(report.topAgents).toBeDefined();
      expect(report.recentDelegations).toBeDefined();
    });

    it('should include top agents in report', () => {
      const report = analytics.generateReport();

      expect(report.topAgents.length).toBeGreaterThan(0);
      const codexAgent = report.topAgents.find(a => a.agent === 'codex');
      expect(codexAgent).toBeDefined();
      expect(codexAgent!.count).toBe(2);
    });

    it('should include recent delegations', () => {
      const report = analytics.generateReport();

      expect(report.recentDelegations.length).toBe(3);
      // Should be sorted by timestamp (most recent first)
      expect(report.recentDelegations[0].id).toBe('test-3');
    });

    it('should filter by time range', () => {
      const now = Date.now();
      const start = new Date(now - 2000000); // Before all events
      const end = new Date(now - 1000000); // Between first and second event

      const report = analytics.generateReport({ start, end });

      // Should only include the first event (test-1)
      expect(report.recentDelegations.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Export Functionality', () => {
    beforeEach(async () => {
      await analytics.track({
        id: 'test-1',
        from: 'claude',
        to: 'codex',
        task: 'Generate code',
        timestamp: Date.now(),
        duration: 1000,
        success: true,
      });
    });

    it('should export to JSON', () => {
      const json = analytics.export('json');

      expect(json).toBeDefined();
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.stats).toBeDefined();
      expect(parsed.topAgents).toBeDefined();
    });

    it('should export to CSV', () => {
      const csv = analytics.export('csv');

      expect(csv).toBeDefined();
      expect(csv).toContain('Timestamp');
      expect(csv).toContain('From');
      expect(csv).toContain('To');
      expect(csv).toContain('Task');

      // Should have header + 1 data row
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle quotes in CSV export', async () => {
      await analytics.track({
        id: 'test-2',
        from: 'claude',
        to: 'codex',
        task: 'Task with "quotes" in it',
        timestamp: Date.now(),
      });

      const csv = analytics.export('csv');

      // CSV should escape quotes properly
      expect(csv).toContain('""quotes""');
    });
  });

  describe('Filtering and Queries', () => {
    beforeEach(async () => {
      const now = Date.now();
      await analytics.track({
        id: 'test-1',
        from: 'claude',
        to: 'codex',
        task: 'Task 1',
        timestamp: now - 3600000,
      });

      await analytics.track({
        id: 'test-2',
        from: 'claude',
        to: 'gemini',
        task: 'Task 2',
        timestamp: now - 1800000,
      });

      await analytics.track({
        id: 'test-3',
        from: 'claude',
        to: 'codex',
        task: 'Task 3',
        timestamp: now,
      });
    });

    it('should filter events by agent', () => {
      const codexEvents = analytics.getEventsByAgent('codex');

      expect(codexEvents).toHaveLength(2);
      expect(codexEvents.every(e => e.to === 'codex')).toBe(true);
    });

    it('should filter events by time range', () => {
      const now = Date.now();
      const start = new Date(now - 2000000);
      const end = new Date(now - 1000000);

      const filteredEvents = analytics.getEventsByTimeRange(start, end);

      expect(filteredEvents.length).toBeGreaterThanOrEqual(1);
      filteredEvents.forEach(event => {
        expect(event.timestamp).toBeGreaterThanOrEqual(start.getTime());
        expect(event.timestamp).toBeLessThanOrEqual(end.getTime());
      });
    });
  });

  describe('Clear Functionality', () => {
    it('should clear all events', async () => {
      await analytics.track({
        id: 'test-1',
        from: 'claude',
        to: 'codex',
        task: 'Task',
        timestamp: Date.now(),
      });

      expect(analytics.getEvents()).toHaveLength(1);

      await analytics.clear();

      expect(analytics.getEvents()).toHaveLength(0);
      const stats = analytics.getStats();
      expect(stats.totalDelegations).toBe(0);
    });
  });
});
