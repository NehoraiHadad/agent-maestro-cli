# 🔀 Refactor 07: Merge Stream Processing

> **Priority:** MEDIUM
> **Can Run in Parallel:** ⚠️ NO (run after Refactor 04-06)
> **Estimated Time:** 2-3 hours
> **Status:** 📋 Pending

---

## 🎯 Objective

Merge `StreamProcessor` and `OutputFormatter` into a single `StreamHandler` class. These two classes are tightly coupled and having them separate adds unnecessary complexity.

**Before:** StreamProcessor + OutputFormatter (2 classes)
**After:** StreamHandler (1 unified class)

---

## 📋 Current Problems

1. **Tight Coupling:** OutputFormatter always used with StreamProcessor
2. **Split Logic:** Related code in two places
3. **Confusing:** Not clear what each class does
4. **Extra Indirection:** Data passed between classes

**Current files:**
- `src/features/streaming/StreamProcessor.ts` (~120 lines)
- `src/features/output/OutputFormatter.ts` (~80 lines)

---

## ✅ Implementation Steps

### Step 1: Create Unified StreamHandler

**File:** `src/features/streaming/StreamHandler.ts` (NEW)

```typescript
/**
 * StreamHandler - Unified stream processing and output formatting
 * Combines parsing, event processing, and output formatting
 */

import { ParserFactory } from './parsers/ParserFactory.js';
import type { StatusUpdate, AgentName } from '../../shared/types/index.js';
import { stripAnsiCodes, cleanOutput } from '../../shared/utils/index.js';

export class StreamHandler {
  private parserFactory: ParserFactory;

  constructor() {
    this.parserFactory = new ParserFactory();
  }

  /**
   * Process streaming event and extract status update
   * @param agentName - Name of the agent
   * @param data - Raw streaming data
   * @returns Status update if any
   */
  processEvent(agentName: AgentName, data: string): StatusUpdate | null {
    try {
      const parser = this.parserFactory.getParser(agentName);

      // Try parsing as JSON
      try {
        const event = JSON.parse(data);
        return parser.parseEvent(event);
      } catch {
        // Not JSON, skip
        return null;
      }
    } catch (error) {
      // Parser error, skip
      return null;
    }
  }

  /**
   * Format final output for display
   * @param output - Raw output from agent
   * @param agentName - Name of the agent
   * @returns Formatted, clean output
   */
  formatOutput(output: string, agentName: AgentName): string {
    let cleaned = output;

    // Step 1: Strip ANSI codes
    cleaned = stripAnsiCodes(cleaned);

    // Step 2: Remove streaming JSON lines (Claude Code specific)
    if (agentName === 'claude') {
      cleaned = this.removeStreamingJson(cleaned);
    }

    // Step 3: Clean up extra whitespace
    cleaned = cleanOutput(cleaned);

    // Step 4: Trim
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Remove streaming JSON lines from output
   */
  private removeStreamingJson(output: string): string {
    return output
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        // Remove lines that look like JSON events
        if (trimmed.startsWith('{') && trimmed.includes('"type"')) {
          return false;
        }
        return true;
      })
      .join('\n');
  }
}
```

### Step 2: Update Maestro.ts

Replace:
```typescript
this.streamProcessor = new StreamProcessor();
this.outputFormatter = new OutputFormatter();
```

With:
```typescript
this.streamHandler = new StreamHandler();
```

Replace:
```typescript
const statusUpdate = this.streamProcessor.processEvent(this.primaryAgent.name, line);
```

With:
```typescript
const statusUpdate = this.streamHandler.processEvent(this.primaryAgent.name, line);
```

Replace:
```typescript
const cleanedOutput = this.outputFormatter.format(
  output,
  this.primaryAgent.name
);
```

With:
```typescript
const cleanedOutput = this.streamHandler.formatOutput(
  output,
  this.primaryAgent.name
);
```

### Step 3: Delete Old Files

Remove:
- `src/features/streaming/StreamProcessor.ts`
- `src/features/output/OutputFormatter.ts`
- `src/features/output/index.ts` (if empty)

### Step 4: Update Exports

**File:** `src/features/streaming/index.ts`

Replace:
```typescript
export { StreamProcessor } from './StreamProcessor.js';
```

With:
```typescript
export { StreamHandler } from './StreamHandler.js';
```

### Step 5: Update Tests

**File:** `tests/unit/StreamHandler.test.ts` (NEW)

```typescript
import { StreamHandler } from '../../src/features/streaming/StreamHandler.js';

describe('StreamHandler', () => {
  let handler: StreamHandler;

  beforeEach(() => {
    handler = new StreamHandler();
  });

  describe('Event Processing', () => {
    it('should process Claude streaming event', () => {
      const event = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hello' }] },
      });

      const update = handler.processEvent('claude', event);
      expect(update).not.toBeNull();
    });

    it('should return null for non-JSON data', () => {
      const update = handler.processEvent('claude', 'regular text');
      expect(update).toBeNull();
    });

    it('should handle invalid JSON gracefully', () => {
      const update = handler.processEvent('claude', '{ invalid json }');
      expect(update).toBeNull();
    });
  });

  describe('Output Formatting', () => {
    it('should strip ANSI codes', () => {
      const output = '\x1b[31mRed text\x1b[0m';
      const formatted = handler.formatOutput(output, 'claude');
      expect(formatted).not.toContain('\x1b');
    });

    it('should remove streaming JSON from Claude output', () => {
      const output = `
{"type":"system","subtype":"init"}
Hello, this is the response
{"type":"result"}
      `;
      const formatted = handler.formatOutput(output, 'claude');
      expect(formatted).not.toContain('{"type"');
      expect(formatted).toContain('Hello');
    });

    it('should trim whitespace', () => {
      const output = '\n\n  Hello  \n\n';
      const formatted = handler.formatOutput(output, 'claude');
      expect(formatted).toBe('Hello');
    });

    it('should handle empty output', () => {
      const formatted = handler.formatOutput('', 'claude');
      expect(formatted).toBe('');
    });
  });

  describe('Multiple Agents', () => {
    it('should process different agent formats', () => {
      const claudeEvent = JSON.stringify({ type: 'assistant' });
      const codexEvent = JSON.stringify({ type: 'turn.started' });

      const claudeUpdate = handler.processEvent('claude', claudeEvent);
      const codexUpdate = handler.processEvent('codex', codexEvent);

      expect(claudeUpdate).not.toBeNull();
      expect(codexUpdate).not.toBeNull();
    });
  });
});
```

Delete old test files:
- `tests/unit/StreamProcessor.test.ts`
- `tests/unit/OutputFormatter.test.ts`

---

## 🧪 Testing Requirements

### Must Pass:
```bash
npm test
# All tests must pass
```

### Verify Output Formatting:
```bash
# Should format output correctly without streaming JSON
node dist/cli/index.js -m "Hello"
```

---

## 📝 Files to Modify

1. **NEW:** `src/features/streaming/StreamHandler.ts`
2. **NEW:** `tests/unit/StreamHandler.test.ts`
3. **MODIFY:** `src/features/orchestration/Maestro.ts`
4. **MODIFY:** `src/features/streaming/index.ts`
5. **DELETE:** `src/features/streaming/StreamProcessor.ts`
6. **DELETE:** `src/features/output/OutputFormatter.ts`
7. **DELETE:** `src/features/output/index.ts`
8. **DELETE:** `tests/unit/StreamProcessor.test.ts`
9. **DELETE:** `tests/unit/OutputFormatter.test.ts`

**Estimated Changes:**
- +120 lines (unified StreamHandler)
- -200 lines (old classes and tests)
- Net: **-80 lines**

---

## ✅ Completion Checklist

- [ ] Create `StreamHandler.ts` with unified logic
- [ ] Update `Maestro.ts` to use StreamHandler
- [ ] Update exports in `streaming/index.ts`
- [ ] Delete old StreamProcessor.ts
- [ ] Delete old OutputFormatter.ts
- [ ] Create new StreamHandler.test.ts
- [ ] Delete old test files
- [ ] Run `npm test` - all pass
- [ ] Run `npm run build` - success
- [ ] Test output formatting manually
- [ ] Commit changes
- [ ] **DELETE THIS FILE**
- [ ] Update `docs/REFACTORING_TASKS.md` status to ✅

---

## 🎯 Success Criteria

- ✅ Single StreamHandler class
- ✅ Clearer code organization
- ✅ All tests pass
- ✅ Output formatting unchanged
- ✅ ~80 lines removed

---

## 🚨 Important Notes

- **Functionality:** Output must look identical after merge
- **Test Coverage:** Maintain test coverage for both parsing and formatting
- **Clean Imports:** Update all imports to use StreamHandler

---

**When done, delete this file and update REFACTORING_TASKS.md** ✅
