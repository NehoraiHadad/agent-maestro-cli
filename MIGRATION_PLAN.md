# תוכנית החלפה: מערכת Delegation ישנה → חדשה

## סיכום ההבדלים

### מערכת ישנה (ProtocolService):
```
Format: MAESTRO_DELEGATE::{"agent":"codex","prompt":"task"}
Parsing: Line-by-line JSON
Agent Selection: Manual
Background: No support
Intelligence: Rule-based
```

### מערכת חדשה (DelegationOrchestrator):
```
Format: [[DELEGATE:codex]]task[[/DELEGATE]]
Parsing: Full text with regex
Agent Selection: AI-powered (AgentSelector)
Background: Full support
Intelligence: Research-based (2025 benchmarks)
```

---

## 📋 קבצים שצריכים שינוי

### שלב 1: Core Components (קריטי)

#### 1.1 **src/features/orchestration/Maestro.ts** 🔴
**שורות:** 1-284 (כל הקובץ)
**שינויים נדרשים:**
- [ ] ייבוא: הוסף `DelegationOrchestrator` במקום `ProtocolService`
- [ ] קונסטרוקטור: צור instance של `DelegationOrchestrator`
- [ ] `executePrimaryAgent()`: החלף את הלוגיקה
  - הסר: `line.includes(DELEGATION_PREFIX)` (שורה 212)
  - הוסף: `orchestrator.processOutput()` אחרי שכל הoutput מוכן
- [ ] `processDelegation()`: מחק את המתודה המלאה (שורות 229-283)
- [ ] `setupEventHandlers()`: עדכן - הסר הטיפול ב-delegations מ-onData
- [ ] הוסף: מתודה חדשה `processDelegationsAfterCompletion()`

**קוד דוגמה:**
```typescript
// Before (Old):
import { ProtocolService } from '../../domain/index.js';

constructor() {
  this.protocolService = new ProtocolService();
}

this.ptyManager.onData(processId, async (data: string) => {
  const lines = data.split('\n');
  for (const line of lines) {
    if (this.protocolService.isDelegationRequest(line)) {
      await this.processDelegation(line, delegations);
    }
  }
});

// After (New):
import { DelegationOrchestrator } from '../delegation/index.js';

constructor() {
  this.delegationOrchestrator = new DelegationOrchestrator({
    maxDepth: this.config.get('maxDelegationDepth'),
    inactivityTimeout: this.config.get('inactivityTimeout'),
    logDelegations: this.config.get('verbose')
  });
}

// Process output AFTER agent completes
this.ptyManager.onExit(processId, async (exitInfo) => {
  // Process delegations from full output
  const delegationResult = await this.delegationOrchestrator.processOutput(output);

  const cleanedOutput = delegationResult.cleanOutput;
  delegations.push(...delegationResult.delegations);

  // ... rest of exit handling
});
```

#### 1.2 **src/features/orchestration/ConfigManager.ts** 🟡
**שינויים נדרשים:**
- [ ] בדוק אם יש הגדרות delegation-specific
- [ ] אין צורך בשינויים (כנראה)

---

### שלב 2: Protocol Updates

#### 2.1 **src/domain/services/ProtocolService.ts** 🟠
**אופציות:**

**אופציה A: מחיקה מלאה** (מומלץ אם אף אחד לא משתמש)
- [ ] מחק את הקובץ כולו
- [ ] מחק ייבוא ב-`src/domain/index.ts`

**אופציה B: Deprecation** (אם יש קוד חיצוני)
- [ ] הוסף `@deprecated` comments
- [ ] צור wrapper ל-`DelegationOrchestrator`
```typescript
/**
 * @deprecated Use DelegationOrchestrator instead
 */
export class ProtocolService {
  private orchestrator: DelegationOrchestrator;

  constructor() {
    console.warn('ProtocolService is deprecated. Use DelegationOrchestrator.');
    this.orchestrator = new DelegationOrchestrator();
  }

  isDelegationRequest(line: string): boolean {
    return this.orchestrator.parser.hasDelegations(line);
  }
  // ... etc
}
```

#### 2.2 **src/shared/constants/protocol.ts** 🟡
**שינויים נדרשים:**
- [ ] שמור את הקבועים הישנים (backward compatibility)
- [ ] הוסף קבועים חדשים:
```typescript
// Old (keep for backward compatibility)
export const DELEGATION_PREFIX = 'MAESTRO_DELEGATE::';
export const DELEGATION_RESULT_PREFIX = '[MAESTRO_RESULT]';
export const DELEGATION_ERROR_PREFIX = '[MAESTRO_ERROR]';

// New
export const DELEGATION_TAG_OPEN = '[[DELEGATE:';
export const DELEGATION_TAG_CLOSE = '[[/DELEGATE]]';
export const DELEGATION_PARALLEL_OPEN = '[[DELEGATE_PARALLEL]]';
export const DELEGATION_PARALLEL_CLOSE = '[[/DELEGATE_PARALLEL]]';
```

---

### שלב 3: Types & Interfaces

#### 3.1 **src/shared/types/delegation.ts** 🟢
**שינויים נדרשים:**
- [ ] בדוק שהטיפוסים תואמים
- [ ] אין צורך בשינויים (כבר תואמים)

---

### שלב 4: UI & User Experience

#### 4.1 **src/cli/commands/StartCommand.ts** 🟡
**שינויים נדרשים:**
- [ ] הוסף system prompt generation
```typescript
import { DelegationOrchestrator } from '../../features/delegation/index.js';

// Before starting Maestro
const delegationPrompt = DelegationOrchestrator.generateSystemPrompt();

// TODO: Add this to agent's system prompt
// This depends on how agents receive their system prompts
```

#### 4.2 **src/features/ui/InteractiveSession.ts** 🟡
**שינויים נדרשים:**
- [ ] הצג תוצאות delegation בפורמט יפה
```typescript
if (result.delegations && result.delegations.length > 0) {
  const formatted = this.maestro.orchestrator.formatResults(result.delegations);
  console.log(formatted);
}
```

---

### שלב 5: Error Handling

#### 5.1 **src/shared/errors/DelegationError.ts** 🟢
**שינויים נדרשים:**
- [ ] בדוק תאימות
- [ ] אין צורך בשינויים (כנראה)

---

### שלב 6: Testing

#### 6.1 **tests/** (אם יש טסטים) 🔴
**שינויים נדרשים:**
- [ ] מצא טסטים שבודקים ProtocolService
- [ ] עדכן אותם לבדוק DelegationOrchestrator
- [ ] הוסף טסטים חדשים:
  - Background delegations
  - AgentSelector intelligence
  - Parallel delegations

---

### שלב 7: Documentation

#### 7.1 **README.md** 🟡
**שינויים נדרשים:**
- [ ] עדכן דוגמאות delegation
- [ ] הוסף קישור ל-DELEGATION_DESIGN.md

#### 7.2 **CAPABILITIES.md** 🟡
**שינויים נדרשים:**
- [ ] עדכן תיאור delegation system
- [ ] הסר התייחסות ל-ProtocolService ישן

---

## 🔢 סדר ביצוע מומלץ

### Phase 1: Preparation (30 דקות)
```bash
# 1. Backup current code
git checkout -b backup-old-delegation
git add -A && git commit -m "backup before delegation migration"

# 2. Create migration branch
git checkout dev
git checkout -b feat/migrate-to-new-delegation

# 3. Run tests to establish baseline
npm test 2>&1 | tee pre-migration-tests.log
```

### Phase 2: Core Migration (2 שעות)

#### Step 1: Update Maestro.ts (60 דקות) 🔴
```typescript
// File: src/features/orchestration/Maestro.ts

// 1. Update imports
import { DelegationOrchestrator } from '../delegation/index.js';
// Remove: import { ProtocolService } from '../../domain/index.js';

// 2. Update class properties
export class Maestro {
  // Remove: private protocolService: ProtocolService;
  private delegationOrchestrator: DelegationOrchestrator;

  // 3. Update constructor
  constructor(primaryAgentName: AgentName, config?: Partial<MaestroConfig>) {
    // ... existing code ...

    // Remove:
    // this.protocolService = new ProtocolService();

    // Add:
    this.delegationOrchestrator = new DelegationOrchestrator({
      maxDepth: this.config.get('maxDelegationDepth'),
      inactivityTimeout: this.config.get('inactivityTimeout'),
      logDelegations: this.config.get('verbose'),
      autoSuggest: true
    });
  }

  // 4. Update executePrimaryAgent
  private async executePrimaryAgent(message: string): Promise<AgentExecutionResult> {
    const processId = `maestro-${this.primaryAgent.name}-${Date.now()}`;
    let output = '';
    let exitCode = 0;

    // ... spinner setup ...

    return new Promise<AgentExecutionResult>((resolve, reject) => {
      try {
        const args = this.primaryAgent.getExecutionArgs(message, { stream: true });
        this.ptyManager.spawn(processId, this.primaryAgent.command, args);

        // Setup data handler (WITHOUT delegation processing)
        this.ptyManager.onData(processId, (data: string) => {
          output += data;

          // Only update spinner, no delegation processing
          const statusUpdate = this.streamProcessor.processEvent(
            this.primaryAgent.name,
            data
          );
          if (statusUpdate && this.statusUpdater) {
            this.statusUpdater.update(
              this.primaryAgent.name,
              statusUpdate.status,
              this.primaryAgent.color
            );
          }
        });

        // Handle exit - THIS IS WHERE WE PROCESS DELEGATIONS
        this.ptyManager.onExit(processId, async (exitInfo) => {
          exitCode = exitInfo.exitCode;

          try {
            // Set current agent context
            this.delegationOrchestrator.setCurrentAgent(this.primaryAgent.name);

            // Process delegations from complete output
            const delegationResult = await this.delegationOrchestrator.processOutput(output);

            // Use cleaned output (without delegation markers)
            const formattedOutput = this.outputFormatter.format(
              delegationResult.cleanOutput,
              this.primaryAgent.name
            );

            // Update spinner
            if (this.spinner) {
              if (exitCode === 0) {
                this.spinner.succeed(`${this.primaryAgent.displayName}: completed`);
              } else {
                this.spinner.fail(`${this.primaryAgent.displayName}: failed`);
              }
            }

            // Add to session
            this.sessionManager.addAssistantMessage(
              formattedOutput,
              this.primaryAgent.name
            );

            // Resolve with results
            resolve({
              agent: this.primaryAgent.name,
              content: formattedOutput,
              delegations: delegationResult.delegations,
              exitCode
            });

          } catch (error) {
            if (this.spinner) {
              this.spinner.fail(`${this.primaryAgent.displayName}: error`);
            }
            reject(error);
          }
        });

      } catch (error) {
        if (this.spinner) {
          this.spinner.fail(`${this.primaryAgent.displayName}: error`);
        }
        reject(error);
      }
    });
  }

  // 5. Remove old methods
  // DELETE: private setupEventHandlers() - entire method
  // DELETE: private async processDelegation() - entire method

  // 6. Add cleanup
  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.spinner) {
      this.spinner.stop();
    }
    this.ptyManager.killAll();
    this.delegationOrchestrator.cleanup(); // Add this
  }
}
```

#### Step 2: Add System Prompt (30 דקות) 🟡
```typescript
// File: src/cli/commands/StartCommand.ts

// Add at the top
import { DelegationOrchestrator } from '../../features/delegation/index.js';

// In execute() method, before maestro.start():
const delegationSystemPrompt = DelegationOrchestrator.generateSystemPrompt();

// TODO: How to inject this into agents?
// Option 1: If agents support system prompts via CLI
// Add to agent execution args

// Option 2: If agents support config files
// Write to ~/.agent-config or similar

// Option 3: Print to console for manual setup
if (this.verbose) {
  console.log('\n' + '='.repeat(60));
  console.log('DELEGATION SYSTEM PROMPT (configure in your agent):');
  console.log('='.repeat(60));
  console.log(delegationSystemPrompt);
  console.log('='.repeat(60) + '\n');
}
```

#### Step 3: Deprecate ProtocolService (15 דקות) 🟠
```typescript
// File: src/domain/services/ProtocolService.ts

// Add at top of class
/**
 * @deprecated This service is deprecated. Use DelegationOrchestrator instead.
 *
 * Migration guide:
 * - Old: ProtocolService.isDelegationRequest(line)
 * - New: DelegationOrchestrator.processOutput(fullText)
 *
 * The new system provides:
 * - Intelligent agent selection
 * - Background delegation support
 * - Better error handling
 * - Research-based recommendations
 *
 * @see DelegationOrchestrator
 * @see DELEGATION_DESIGN.md
 */
export class ProtocolService {
  // ... existing code with deprecation warnings ...
}
```

#### Step 4: Update Types (15 דקות) 🟢
```typescript
// File: src/shared/types/delegation.ts

// Ensure compatibility
export interface DelegationResult {
  fromAgent?: AgentName;  // Old format
  toAgent?: AgentName;    // Old format

  // New format (from DelegationOrchestrator)
  agent: AgentName;
  task: string;
  success: boolean;
  result?: string;
  error?: string;
  duration?: number;
  background?: boolean;
  pending?: boolean;
}
```

### Phase 3: Testing (1 שעה)

#### Step 5: Build & Test (30 דקות)
```bash
# 1. Build
npm run build

# 2. Test basic functionality
node dist/cli/index.js --agent codex

# 3. Test with delegation
# Create test with delegation markers
echo "Test: [[DELEGATE:gemini]]search for info[[/DELEGATE]]" | \
  node dist/cli/index.js --agent claude

# 4. Check background delegations
# (manual test with agent that supports it)

# 5. Run unit tests
npm test
```

#### Step 6: Integration Tests (30 דקות)
```bash
# Create test script
cat > /tmp/test-new-delegation.sh <<'EOF'
#!/bin/bash
echo "Testing new delegation system..."

# Test 1: Sequential
echo "=== Test 1: Sequential Delegation ==="
echo "Analyze code and implement" | timeout 60 node dist/cli/index.js --agent claude

# Test 2: Parallel (if supported)
echo "=== Test 2: Parallel Delegation ==="
# (requires agent to output parallel format)

# Test 3: Background (if supported)
echo "=== Test 3: Background Delegation ==="
# (requires agent to output background format)

echo "All tests completed!"
EOF

chmod +x /tmp/test-new-delegation.sh
/tmp/test-new-delegation.sh
```

### Phase 4: Cleanup & Documentation (30 דקות)

#### Step 7: Remove Old Code (15 דקות)
```bash
# Only if Option A (full removal) chosen

# 1. Remove ProtocolService
rm src/domain/services/ProtocolService.ts

# 2. Update exports
# Edit src/domain/index.ts - remove ProtocolService export

# 3. Remove old constants (optional - keep for backward compat)
# Edit src/shared/constants/protocol.ts
```

#### Step 8: Update Docs (15 דקות)
```markdown
<!-- File: README.md -->

## Delegation System

AgentMaestro features an intelligent delegation system that allows
agents to delegate tasks to other specialized agents.

### Quick Start

Agents can delegate using the following syntax:

\`\`\`
[[DELEGATE:agent_name]]
Task description
[[/DELEGATE]]
\`\`\`

For detailed documentation, see:
- [Delegation Design](DELEGATION_DESIGN.md)
- [Usage Guide](DELEGATION_USAGE.md)

### Example

\`\`\`
User: "Build auth system with tests"

Claude: "I'll delegate implementation to Codex:
[[DELEGATE:codex]]
Implement JWT authentication with bcrypt
[[/DELEGATE]]

Based on the implementation, I'll review..."
\`\`\`
```

### Phase 5: Commit & Deploy (15 דקות)

```bash
# 1. Stage changes
git add -A

# 2. Commit
git commit -m "feat: migrate to intelligent delegation system

BREAKING CHANGE: Replaced ProtocolService with DelegationOrchestrator

Old format (deprecated):
  MAESTRO_DELEGATE::{\"agent\":\"codex\",\"prompt\":\"task\"}

New format:
  [[DELEGATE:codex]]task[[/DELEGATE]]

New features:
- Intelligent agent selection (AgentSelector)
- Background delegation support
- Parallel delegation support
- Research-based recommendations (2025 benchmarks)
- Better error handling

Migration guide: See MIGRATION_PLAN.md

Changes:
- Maestro.ts: Use DelegationOrchestrator instead of ProtocolService
- ProtocolService.ts: Deprecated (backward compatibility)
- Added system prompt generation
- Updated types for new delegation format

Closes #XXX"

# 3. Push
git push origin feat/migrate-to-new-delegation

# 4. Create PR (if using GitHub)
gh pr create --title "Migrate to intelligent delegation system" \
  --body "See MIGRATION_PLAN.md for details"
```

---

## ⚠️  Breaking Changes & Risks

### Breaking Changes:
1. **Protocol Format**: `MAESTRO_DELEGATE::` → `[[DELEGATE:agent]]`
2. **Timing**: Line-by-line → After completion
3. **API**: `ProtocolService` → `DelegationOrchestrator`

### Risks:
1. **Existing Agents**: Need to update to new format
2. **External Code**: Any code using ProtocolService will break
3. **Tests**: Existing tests may fail

### Mitigation:
1. Keep ProtocolService with deprecation warnings
2. Support both formats temporarily (transition period)
3. Add migration guide for external users

---

## 📊 Validation Checklist

After migration, verify:

- [ ] `npm run build` succeeds
- [ ] `npm test` passes (or update tests)
- [ ] Basic agent execution works
- [ ] Delegation parsing works (test with [[DELEGATE:...]])
- [ ] Spinner updates correctly
- [ ] Output formatting is clean
- [ ] Session tracking includes delegations
- [ ] Background delegations work (if implemented)
- [ ] Error handling is robust
- [ ] Documentation is updated
- [ ] No TypeScript errors
- [ ] No runtime errors in console

---

## 🆘 Rollback Plan

If something goes wrong:

```bash
# Quick rollback
git checkout dev
git reset --hard backup-old-delegation

# Or revert the commit
git revert <commit-hash>

# Or cherry-pick specific fixes
git cherry-pick <good-commit>
```

---

## 📞 Support & Questions

During migration, reference:
- `DELEGATION_DESIGN.md` - Architecture details
- `DELEGATION_USAGE.md` - Usage examples
- `src/features/delegation/` - Implementation code

---

**סה"כ זמן משוער:** 4-5 שעות
**קריטיות:** גבוהה (core functionality)
**סיכון:** בינוני (יש rollback)
**תועלת:** גבוהה מאוד (AI-powered, modern, flexible)
