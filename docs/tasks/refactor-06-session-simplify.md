# 🔄 Refactor 06: Simplify SessionManager

> **Priority:** MEDIUM
> **Can Run in Parallel:** ✅ YES (with Refactor 04, 05)
> **Estimated Time:** 2-3 hours
> **Status:** 📋 Pending

---

## 🎯 Objective

Simplify `SessionManager` to focus only on what's needed: tracking CLI session state for continuation. Remove unnecessary complexity and over-engineering.

**Before:** Complex session manager with multiple message types and history
**After:** Simple CLI session tracker with session ID and active state

---

## 📋 Current Problems

1. **Too Complex:** Tracks messages, summaries, multiple session types
2. **Over-engineered:** Features not used by simple wrapper
3. **Confusing API:** Multiple methods for simple task
4. **Memory overhead:** Stores message history unnecessarily

**Current file:** `src/features/orchestration/SessionManager.ts` (~150+ lines)

---

## ✅ Implementation Steps

### Step 1: Create Simplified SessionManager

**File:** `src/features/orchestration/SessionManager.ts`

Replace entire file with:

```typescript
/**
 * Simple Session Manager for Claude CLI continuation
 * Only tracks session ID and active state - nothing more
 */

export interface CliSession {
  sessionId: string | null;
  isActive: boolean;
}

/**
 * Manages CLI session state for --continue and --resume flags
 */
export class SessionManager {
  private sessions: Map<string, CliSession> = new Map();

  /**
   * Get CLI session for an agent
   */
  getCliSession(agentName: string): CliSession | null {
    return this.sessions.get(agentName) || null;
  }

  /**
   * Set CLI session (after extracting session ID)
   */
  setCliSession(agentName: string, session: CliSession): void {
    this.sessions.set(agentName, session);
  }

  /**
   * Activate session (marks as ready for --continue)
   */
  activateCliSession(agentName: string): void {
    const existing = this.sessions.get(agentName);
    if (existing) {
      existing.isActive = true;
    } else {
      this.sessions.set(agentName, {
        sessionId: null,
        isActive: true,
      });
    }
  }

  /**
   * Clear session (start fresh conversation)
   */
  clearCliSession(agentName: string): void {
    this.sessions.delete(agentName);
  }

  /**
   * Check if session is active
   */
  isSessionActive(agentName: string): boolean {
    return this.sessions.get(agentName)?.isActive ?? false;
  }

  /**
   * Get session ID if available
   */
  getSessionId(agentName: string): string | null {
    return this.sessions.get(agentName)?.sessionId ?? null;
  }
}
```

### Step 2: Remove Unused Methods from Maestro

**File:** `src/features/orchestration/Maestro.ts`

Remove these method calls:
- `sessionManager.addUserMessage()`
- `sessionManager.addAssistantMessage()`
- `sessionManager.getSummary()`

Keep only:
- `sessionManager.getCliSession()`
- `sessionManager.setCliSession()`
- `sessionManager.activateCliSession()`
- `sessionManager.clearCliSession()`

### Step 3: Update getStats() Method

**File:** `src/features/orchestration/Maestro.ts`

Replace:
```typescript
getStats(): MaestroStats {
  const summary = this.sessionManager.getSummary();
  const metrics = this.metricsCollector.getSummary();

  return {
    totalMessages: summary.messageCount,
    sessionDuration: summary.duration,
    // ...
  };
}
```

With:
```typescript
getStats(): MaestroStats {
  const metrics = this.metricsCollector.getSummary();
  const sessionDuration = Date.now() - this.sessionStartTime;

  return {
    totalMessages: this.messageCount, // Simple counter
    sessionDuration,
    totalExecutions: metrics.totalExecutions,
    successfulExecutions: metrics.successfulExecutions,
    failedExecutions: metrics.failedExecutions,
    averageExecutionTime: metrics.averageExecutionTime,
  };
}
```

Add to Maestro class:
```typescript
private sessionStartTime: number = 0;
private messageCount: number = 0;
```

Initialize in `start()`:
```typescript
async start(): Promise<void> {
  this.sessionStartTime = Date.now();
  // ... rest of start logic
}
```

Increment in `sendMessage()`:
```typescript
async sendMessage(message: string): Promise<AgentExecutionResult> {
  this.messageCount++;
  // ... rest of sendMessage logic
}
```

### Step 4: Update Tests

**File:** `tests/unit/SessionManager.test.ts`

Replace all tests with simplified tests:

```typescript
import { SessionManager } from '../../src/features/orchestration/SessionManager.js';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('CLI Session Management', () => {
    it('should return null for non-existent session', () => {
      const session = sessionManager.getCliSession('claude');
      expect(session).toBeNull();
    });

    it('should set and get CLI session', () => {
      sessionManager.setCliSession('claude', {
        sessionId: 'test-session-123',
        isActive: true,
      });

      const session = sessionManager.getCliSession('claude');
      expect(session).not.toBeNull();
      expect(session?.sessionId).toBe('test-session-123');
      expect(session?.isActive).toBe(true);
    });

    it('should activate session', () => {
      sessionManager.activateCliSession('claude');

      const session = sessionManager.getCliSession('claude');
      expect(session?.isActive).toBe(true);
    });

    it('should clear session', () => {
      sessionManager.setCliSession('claude', {
        sessionId: 'test-123',
        isActive: true,
      });

      sessionManager.clearCliSession('claude');

      const session = sessionManager.getCliSession('claude');
      expect(session).toBeNull();
    });

    it('should check if session is active', () => {
      expect(sessionManager.isSessionActive('claude')).toBe(false);

      sessionManager.activateCliSession('claude');
      expect(sessionManager.isSessionActive('claude')).toBe(true);
    });

    it('should get session ID', () => {
      expect(sessionManager.getSessionId('claude')).toBeNull();

      sessionManager.setCliSession('claude', {
        sessionId: 'test-id',
        isActive: true,
      });

      expect(sessionManager.getSessionId('claude')).toBe('test-id');
    });
  });

  describe('Multiple Agents', () => {
    it('should manage sessions for multiple agents independently', () => {
      sessionManager.setCliSession('claude', {
        sessionId: 'claude-123',
        isActive: true,
      });

      sessionManager.setCliSession('codex', {
        sessionId: 'codex-456',
        isActive: false,
      });

      expect(sessionManager.getSessionId('claude')).toBe('claude-123');
      expect(sessionManager.getSessionId('codex')).toBe('codex-456');
      expect(sessionManager.isSessionActive('claude')).toBe(true);
      expect(sessionManager.isSessionActive('codex')).toBe(false);
    });
  });
});
```

### Step 5: Remove Message Types

**File:** `src/shared/types/index.ts`

Remove if no longer used:
- `Message` interface
- `MessageRole` type
- Any message-related types

---

## 🧪 Testing Requirements

### Must Pass:
```bash
npm test
# All tests must pass with simplified SessionManager
```

### Verify Session Continuation Still Works:

**Test 1: First Message (No Session)**
```bash
node dist/cli/index.js
> Hello
# Should NOT use --continue (first message)
```

**Test 2: Second Message (Active Session)**
```bash
# In same session
> Another message
# Should use --continue or --resume <sessionId>
```

**Test 3: Reset Session**
```bash
> /reset
# Should clear session
> New message
# Should NOT use --continue
```

---

## 📝 Files to Modify

1. **SIMPLIFY:** `src/features/orchestration/SessionManager.ts` (~80 lines)
2. **MODIFY:** `src/features/orchestration/Maestro.ts`
3. **MODIFY:** `tests/unit/SessionManager.test.ts`
4. **CLEANUP:** `src/shared/types/index.ts` (remove unused types)

**Estimated Changes:**
- +80 lines (simplified SessionManager)
- -160 lines (old complex SessionManager)
- Net: **-80 lines**

---

## ✅ Completion Checklist

- [ ] Rewrite SessionManager.ts with simple implementation
- [ ] Remove message tracking from Maestro.ts
- [ ] Add sessionStartTime and messageCount to Maestro
- [ ] Update getStats() to use simple counters
- [ ] Update SessionManager tests
- [ ] Remove unused message types
- [ ] Run `npm test` - all pass
- [ ] Run `npm run build` - success
- [ ] Test session continuation manually
- [ ] Commit changes
- [ ] **DELETE THIS FILE**
- [ ] Update `docs/REFACTORING_TASKS.md` status to ✅

---

## 🎯 Success Criteria

- ✅ SessionManager under 100 lines
- ✅ Only tracks session ID and active state
- ✅ Session continuation still works
- ✅ All tests pass
- ✅ Simpler, clearer code
- ✅ ~80 lines removed

---

## 🚨 Important Notes

- **Critical Feature:** Session continuation MUST still work
- **Test Thoroughly:** --continue and --resume flags
- **Keep Simple:** Only what's needed for CLI session
- **Remove Dead Code:** Clean up unused message tracking

---

**When done, delete this file and update REFACTORING_TASKS.md** ✅
