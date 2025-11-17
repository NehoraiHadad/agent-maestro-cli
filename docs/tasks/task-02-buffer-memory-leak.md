# Task 02: Fix Buffer Memory Leak

> **Priority:** HIGH
> **Estimated Time:** 3-4 hours
> **Files to Modify:**
> - `src/features/execution/pty/PTYLifecycle.ts`
> - `src/shared/constants/buffers.ts` (new)
> - `tests/unit/PTYLifecycle.test.ts` (new)

---

## 🎯 Objective

Fix unbounded buffer growth in PTYLifecycle that can cause memory leaks in long-running processes. Implement a bounded ring buffer with automatic rotation.

---

## 📋 Current Problem

PTYLifecycle accumulates ALL output in memory without any limits:

```typescript
// src/features/execution/pty/PTYLifecycle.ts:86-92
appendToBuffer(id: string, data: string): void {
  const info = this.processes.get(id);
  if (info) {
    info.buffer += data;  // ⚠️ Unbounded growth!
  }
}
```

**Risk:**
- Long-running AI agent sessions could accumulate gigabytes of output
- Server crashes due to OOM (Out of Memory)
- Poor performance as buffer size increases

---

## ✅ Implementation Requirements

### 1. Create Buffer Constants

**File:** `src/shared/constants/buffers.ts`

```typescript
/**
 * Buffer size constants for PTY process management
 */

/** Maximum buffer size in bytes (default: 10MB) */
export const DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB

/** Warning threshold - log warning when buffer reaches this size */
export const BUFFER_WARNING_THRESHOLD = 0.8; // 80% of max size

/** Trim percentage - when buffer exceeds max, trim to this percentage */
export const BUFFER_TRIM_TO_PERCENTAGE = 0.5; // Trim to 50% of max size

/** Minimum buffer size (safety check) */
export const MIN_BUFFER_SIZE = 1024; // 1KB
```

### 2. Update PTYLifecycle Class

**File:** `src/features/execution/pty/PTYLifecycle.ts`

Add the following changes:

```typescript
import {
  DEFAULT_MAX_BUFFER_SIZE,
  BUFFER_WARNING_THRESHOLD,
  BUFFER_TRIM_TO_PERCENTAGE
} from '../../../shared/constants/buffers.js';

export class PTYLifecycle {
  private processes: Map<string, ProcessInfo>;
  private maxBufferSize: number;
  private bufferTrimCount: Map<string, number>; // Track trim events per process

  constructor(maxBufferSize: number = DEFAULT_MAX_BUFFER_SIZE) {
    this.processes = new Map();
    this.maxBufferSize = maxBufferSize;
    this.bufferTrimCount = new Map();
  }

  /**
   * Append data to process buffer with automatic rotation
   * @param id - Process identifier
   * @param data - Data to append
   */
  appendToBuffer(id: string, data: string): void {
    const info = this.processes.get(id);
    if (!info) {
      return;
    }

    // Append data
    info.buffer += data;

    // Check if buffer needs trimming
    const currentSize = Buffer.byteLength(info.buffer, 'utf8');

    // Log warning if approaching limit
    if (currentSize > this.maxBufferSize * BUFFER_WARNING_THRESHOLD) {
      this.logBufferWarning(id, currentSize);
    }

    // Trim if exceeded
    if (currentSize > this.maxBufferSize) {
      this.trimBuffer(id);
    }
  }

  /**
   * Trim buffer to prevent memory overflow
   * @param id - Process identifier
   */
  private trimBuffer(id: string): void {
    const info = this.processes.get(id);
    if (!info) {
      return;
    }

    const currentSize = Buffer.byteLength(info.buffer, 'utf8');
    const targetSize = Math.floor(this.maxBufferSize * BUFFER_TRIM_TO_PERCENTAGE);

    // Calculate how many bytes to remove
    const bytesToRemove = currentSize - targetSize;

    // Find the character position that roughly corresponds to bytesToRemove
    // This is approximate since UTF-8 characters can be 1-4 bytes
    let removedBytes = 0;
    let charPosition = 0;

    while (removedBytes < bytesToRemove && charPosition < info.buffer.length) {
      const charCode = info.buffer.charCodeAt(charPosition);
      const charByteSize = this.getUtf8ByteSize(charCode);
      removedBytes += charByteSize;
      charPosition++;
    }

    // Trim the buffer (keep most recent data)
    info.buffer = info.buffer.slice(charPosition);

    // Track trim events
    const trimCount = (this.bufferTrimCount.get(id) || 0) + 1;
    this.bufferTrimCount.set(id, trimCount);

    // Log the trim event
    this.logBufferTrimmed(id, bytesToRemove, currentSize, trimCount);
  }

  /**
   * Get UTF-8 byte size for a character code
   * @param charCode - Character code
   * @returns Byte size (1-4)
   */
  private getUtf8ByteSize(charCode: number): number {
    if (charCode <= 0x7F) return 1;
    if (charCode <= 0x7FF) return 2;
    if (charCode <= 0xFFFF) return 3;
    return 4;
  }

  /**
   * Log buffer warning when approaching limit
   * @param id - Process identifier
   * @param currentSize - Current buffer size in bytes
   */
  private logBufferWarning(id: string, currentSize: number): void {
    const percentage = ((currentSize / this.maxBufferSize) * 100).toFixed(1);
    console.warn(
      `[PTYLifecycle] Process ${id} buffer at ${percentage}% capacity ` +
      `(${this.formatBytes(currentSize)} / ${this.formatBytes(this.maxBufferSize)})`
    );
  }

  /**
   * Log buffer trim event
   * @param id - Process identifier
   * @param bytesRemoved - Number of bytes removed
   * @param previousSize - Size before trimming
   * @param trimCount - Total number of trims for this process
   */
  private logBufferTrimmed(
    id: string,
    bytesRemoved: number,
    previousSize: number,
    trimCount: number
  ): void {
    const newSize = previousSize - bytesRemoved;
    console.log(
      `[PTYLifecycle] Buffer trimmed for process ${id} ` +
      `(trim #${trimCount}): ` +
      `${this.formatBytes(previousSize)} → ${this.formatBytes(newSize)} ` +
      `(removed ${this.formatBytes(bytesRemoved)})`
    );
  }

  /**
   * Format bytes to human-readable string
   * @param bytes - Number of bytes
   * @returns Formatted string (e.g., "1.5 MB")
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Get buffer statistics for a process
   * @param id - Process identifier
   * @returns Buffer stats or null if process not found
   */
  getBufferStats(id: string): {
    currentSize: number;
    maxSize: number;
    utilization: number;
    trimCount: number;
  } | null {
    const info = this.processes.get(id);
    if (!info) {
      return null;
    }

    const currentSize = Buffer.byteLength(info.buffer, 'utf8');
    const utilization = (currentSize / this.maxBufferSize) * 100;
    const trimCount = this.bufferTrimCount.get(id) || 0;

    return {
      currentSize,
      maxSize: this.maxBufferSize,
      utilization,
      trimCount
    };
  }

  /**
   * Clear trim count when process is killed
   * (Add this to the existing kill method)
   */
  kill(id: string, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): boolean {
    // ... existing kill logic ...

    // Clean up trim count
    this.bufferTrimCount.delete(id);

    // ... rest of existing logic ...
  }
}
```

### 3. Update Buffer Constants Export

**File:** `src/shared/constants/index.ts`

Add:
```typescript
export * from './buffers.js';
```

### 4. Create Unit Tests

**File:** `tests/unit/PTYLifecycle.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { PTYLifecycle } from '../../src/features/execution/pty/PTYLifecycle.js';
import type { IPty } from 'node-pty';

describe('PTYLifecycle', () => {
  let lifecycle: PTYLifecycle;
  const mockProcess = {
    pid: 1234,
    write: jest.fn(),
    kill: jest.fn(),
    onData: jest.fn(),
    onExit: jest.fn(),
  } as unknown as IPty;

  beforeEach(() => {
    lifecycle = new PTYLifecycle(1024); // 1KB for testing
  });

  describe('Buffer Management', () => {
    it('should append data to buffer', () => {
      lifecycle.register('test-id', mockProcess);
      lifecycle.appendToBuffer('test-id', 'Hello');

      const buffer = lifecycle.getBuffer('test-id');
      expect(buffer).toBe('Hello');
    });

    it('should trim buffer when exceeding max size', () => {
      lifecycle.register('test-id', mockProcess);

      // Add data exceeding 1KB
      const largeData = 'a'.repeat(2000);
      lifecycle.appendToBuffer('test-id', largeData);

      const buffer = lifecycle.getBuffer('test-id');
      const bufferSize = Buffer.byteLength(buffer, 'utf8');

      // Buffer should be trimmed to ~50% of max size (512 bytes)
      expect(bufferSize).toBeLessThan(1024);
      expect(bufferSize).toBeGreaterThan(400); // ~50% with some tolerance
    });

    it('should track trim count', () => {
      lifecycle.register('test-id', mockProcess);

      // Trigger multiple trims
      for (let i = 0; i < 3; i++) {
        const largeData = 'a'.repeat(2000);
        lifecycle.appendToBuffer('test-id', largeData);
      }

      const stats = lifecycle.getBufferStats('test-id');
      expect(stats).not.toBeNull();
      expect(stats!.trimCount).toBeGreaterThan(0);
    });

    it('should provide buffer statistics', () => {
      lifecycle.register('test-id', mockProcess);
      lifecycle.appendToBuffer('test-id', 'Test data');

      const stats = lifecycle.getBufferStats('test-id');
      expect(stats).not.toBeNull();
      expect(stats!.currentSize).toBeGreaterThan(0);
      expect(stats!.maxSize).toBe(1024);
      expect(stats!.utilization).toBeGreaterThan(0);
      expect(stats!.utilization).toBeLessThanOrEqual(100);
    });

    it('should keep most recent data when trimming', () => {
      lifecycle.register('test-id', mockProcess);

      lifecycle.appendToBuffer('test-id', 'OLD_DATA_');
      lifecycle.appendToBuffer('test-id', 'a'.repeat(2000));
      lifecycle.appendToBuffer('test-id', '_NEW_DATA');

      const buffer = lifecycle.getBuffer('test-id');

      // Should NOT contain old data
      expect(buffer).not.toContain('OLD_DATA_');
      // Should contain recent data
      expect(buffer).toContain('_NEW_DATA');
    });

    it('should clear trim count on process kill', () => {
      lifecycle.register('test-id', mockProcess);

      // Trigger trim
      const largeData = 'a'.repeat(2000);
      lifecycle.appendToBuffer('test-id', largeData);

      // Kill process
      lifecycle.kill('test-id');

      // Stats should be null after kill
      const stats = lifecycle.getBufferStats('test-id');
      expect(stats).toBeNull();
    });
  });

  describe('Buffer Stats', () => {
    it('should return null for non-existent process', () => {
      const stats = lifecycle.getBufferStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should calculate utilization correctly', () => {
      lifecycle.register('test-id', mockProcess);

      // Add data that's 50% of max size
      const halfData = 'a'.repeat(512);
      lifecycle.appendToBuffer('test-id', halfData);

      const stats = lifecycle.getBufferStats('test-id');
      expect(stats!.utilization).toBeGreaterThan(40);
      expect(stats!.utilization).toBeLessThan(60);
    });
  });
});
```

---

## 🧪 Testing Instructions

1. **Run unit tests:**
   ```bash
   npm run test -- PTYLifecycle.test.ts
   ```

2. **Test with TypeScript compilation:**
   ```bash
   npm run build
   ```

3. **Stress test (manual):**
   ```bash
   # Create a test script that generates lots of output
   echo 'for i in {1..10000}; do echo "Line $i with some data"; done' > /tmp/test-output.sh
   chmod +x /tmp/test-output.sh

   # Run with maestro and observe memory usage
   maestro -m "Run /tmp/test-output.sh"
   ```

4. **Check buffer statistics:**
   Add temporary logging in `Maestro.ts` to display buffer stats periodically.

---

## ✅ Acceptance Criteria

- [ ] Buffer constants defined in buffers.ts
- [ ] PTYLifecycle implements bounded buffer with rotation
- [ ] Buffer trim logic keeps most recent data
- [ ] Trim events are logged with statistics
- [ ] getBufferStats() method provides accurate metrics
- [ ] All unit tests passing (100% coverage for buffer logic)
- [ ] TypeScript compilation successful
- [ ] Manual stress test confirms no unbounded growth
- [ ] Memory usage stays bounded in long-running sessions

---

## 📊 Performance Validation

After implementation, verify:

1. **Memory Usage:**
   - Start maestro
   - Generate 100MB+ of output
   - Confirm memory stays below 50MB for buffer

2. **Trim Behavior:**
   - Check console logs for trim events
   - Verify trim count increases appropriately
   - Confirm most recent data is preserved

3. **Performance:**
   - No significant slowdown when trimming
   - Buffer operations remain O(1) or O(n) where n is trim size

---

## 📝 Completion Steps

1. Implement all code changes
2. Run all tests and verify they pass
3. Perform stress testing
4. Verify memory stays bounded
5. Commit changes: `git commit -m "fix: Implement bounded buffer to prevent memory leaks (Task 02)"`
6. Delete this task file: `rm docs/tasks/task-02-buffer-memory-leak.md`
7. Update `docs/TASKS_MASTER.md` with completion status

---

## 🔗 Related Tasks

- Task 06: Metrics Collection with Rotation (similar pattern)
- Task 08: Comprehensive Test Suite

---

**Ready to fix this critical memory issue? Let's do it! 💪**
