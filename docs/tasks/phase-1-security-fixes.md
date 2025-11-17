# Phase 1: Security Fixes 🔴

**Execution Mode:** ✅ **PARALLEL** - All tasks can run simultaneously
**Estimated Time:** ~5 minutes
**Priority:** CRITICAL

---

## ⚠️ Important Instructions

1. **Run all 3 tasks in PARALLEL** - they are independent
2. After completion, run `npm run build` to verify
3. Update `docs/IMPLEMENTATION_TRACKER.md` when done
4. **DELETE THIS FILE** after all tasks are completed and verified

---

## Task 1.1: Fix Command Injection Vulnerability

**File:** `src/features/execution/pty/PTYSpawner.ts`
**Lines:** 42-50
**Severity:** CRITICAL 🔴

### What to do:

Replace the `isCommandAvailable` method with this secure implementation:

```typescript
/**
 * Check if command exists in system (secure implementation)
 */
async isCommandAvailable(command: string): Promise<boolean> {
  try {
    const { spawn } = await import('child_process');
    return new Promise((resolve) => {
      const process = spawn('which', [command], {
        stdio: 'ignore'
      });

      process.on('error', () => resolve(false));
      process.on('exit', (code) => resolve(code === 0));

      // Timeout after 2 seconds
      setTimeout(() => {
        process.kill();
        resolve(false);
      }, 2000);
    });
  } catch {
    return false;
  }
}
```

### Why:
The current implementation uses `execSync(\`which ${command}\`)` which is vulnerable to command injection.
If `command` contains malicious input like `"ls; rm -rf /"`, it will execute.

### Verification:
- No compilation errors
- `spawn()` is used instead of `execSync()`
- Command is passed as array argument, not string interpolation

**Status:** [ ] Completed

---

## Task 1.2: Fix Insecure Session ID Generation

**Files:**
- `src/features/orchestration/SessionManager.ts` (lines 258-260)
- `src/features/logging/LoggingManager.ts` (lines 309-314)

**Severity:** HIGH 🔴

### File 1: SessionManager.ts

Add import at the top:
```typescript
import { randomUUID } from 'crypto';
```

Replace the `generateSessionId` method:
```typescript
/**
 * Generate a unique session ID using cryptographically secure random
 * @returns Unique session identifier
 */
private generateSessionId(): string {
  return `session_${Date.now()}_${randomUUID()}`;
}
```

### File 2: LoggingManager.ts

Add import at the top:
```typescript
import { randomUUID } from 'crypto';
```

Replace the `generateSessionId` method:
```typescript
/**
 * Generate unique session ID using cryptographically secure random
 */
private generateSessionId(): string {
  const timestamp = Date.now();
  return `${timestamp}-${randomUUID()}`;
}
```

### Why:
`Math.random()` is NOT cryptographically secure and predictable.
Session IDs must use `crypto.randomUUID()` for security.

### Verification:
- `randomUUID` is imported from 'crypto'
- No more `Math.random()` usage
- Session IDs are now unpredictable

**Status:** [ ] Completed

---

## Task 1.3: Add Graceful Shutdown for PTY Processes

**File:** `src/features/execution/pty/PTYManager.ts`
**Lines:** 135-143

**Severity:** MEDIUM 🟡

### What to do:

Replace the `killAll` method and add `killGracefully` helper:

```typescript
/**
 * Kill all processes gracefully with timeout
 */
async killAll(gracefulTimeoutMs: number = 5000): Promise<void> {
  const runningIds = this.lifecycle.getRunningIds();
  const killPromises = runningIds.map(id =>
    this.killGracefully(id, gracefulTimeoutMs)
  );
  await Promise.allSettled(killPromises);
}

/**
 * Kill a single process gracefully
 * First tries SIGTERM, then SIGKILL after timeout
 */
private async killGracefully(id: string, timeoutMs: number): Promise<void> {
  try {
    // Try graceful termination first
    this.kill(id, 'SIGTERM');

    // Wait for graceful shutdown
    const startTime = Date.now();
    while (this.isRunning(id) && (Date.now() - startTime < timeoutMs)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Force kill if still running
    if (this.isRunning(id)) {
      this.kill(id, 'SIGKILL');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } finally {
    // Always cleanup event handlers
    this.eventEmitter.remove(id);
  }
}
```

### Also update Maestro.ts:

**File:** `src/features/orchestration/Maestro.ts`
**Line:** 127

Change from:
```typescript
this.ptyManager.killAll();
```

To:
```typescript
await this.ptyManager.killAll();
```

And ensure `stop()` is async (line 116):
```typescript
async stop(): Promise<void> {
```

### Why:
Current implementation kills processes immediately (SIGKILL equivalent).
Graceful shutdown sends SIGTERM first, waits for cleanup, then SIGKILL if needed.

### Verification:
- `killAll()` is now async
- `killGracefully()` private method exists
- SIGTERM sent before SIGKILL
- Timeout logic in place
- `Maestro.stop()` awaits killAll

**Status:** [ ] Completed

---

## Post-Completion Checklist

After completing all 3 tasks:

- [ ] Run `npm run clean`
- [ ] Run `npm run build`
- [ ] Verify no TypeScript errors
- [ ] Update `docs/IMPLEMENTATION_TRACKER.md`:
  - Change Phase 1 status to ✅ Completed
  - Mark all 3 tasks as `[x]`
  - Update "Tasks Completed" to 3/3
- [ ] Commit changes with message: `fix: Phase 1 - Security fixes (command injection, session IDs, graceful shutdown)`
- [ ] **DELETE THIS FILE** (`docs/tasks/phase-1-security-fixes.md`)

---

## Troubleshooting

### If build fails:
1. Check import statements are correct
2. Verify all files are saved
3. Run `npx tsc --noEmit` to see exact errors
4. Fix errors and rebuild

### If tests fail:
1. Run `npm test` to see which test failed
2. Check the specific test file
3. Verify changes didn't break functionality

---

**Created:** 2025-01-17
**Phase:** 1 of 6
**Next Phase:** Phase 2 - Create Utility Classes
