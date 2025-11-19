# 🎯 Ready-to-Use Agent Prompts

This file contains ready-to-use prompts for delegating tasks to AI agents. Each prompt includes instructions to read the relevant task file, execute the task, and clean up afterward.

---

## 📋 Usage Instructions

1. **Choose a task** from the list below
2. **Copy the entire prompt** for that task
3. **Paste into your AI agent** (Claude, Codex, etc.)
4. **Let the agent execute** the task autonomously
5. **Agent will update** docs/tasks/README.md and delete the task file when done

---

## 🚀 Phase 1: Critical Fixes

### TASK-001: Fix Version Mismatch

```
Read the task specification in docs/tasks/TASK-001-fix-version-mismatch.md and implement the solution completely.

Your objectives:
1. Read and understand the task requirements
2. Implement the solution as specified
3. Run all tests to ensure nothing breaks
4. Update CHANGELOG.md with the fix
5. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-001 as ✅ Completed, update progress
   - Delete docs/tasks/TASK-001-fix-version-mismatch.md
   - Commit with message: "fix: synchronize CLI version with package.json (TASK-001)"

Be thorough and follow the acceptance criteria precisely.
```

---

### TASK-002: Decide & Implement Wrapper Strategy

```
Read the task specification in docs/tasks/TASK-002-wrapper-strategy.md and make a strategic decision about the architecture.

Your objectives:
1. Read and analyze both options (Pure Wrapper vs Hybrid)
2. Make an informed decision based on project goals and current state
3. Document the decision in docs/ARCHITECTURE.md
4. Implement the chosen strategy completely
5. Update README.md and all relevant documentation
6. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-002 as ✅ Completed
   - Unblock tasks: TASK-003, TASK-004, TASK-005, TASK-006
   - Delete docs/tasks/TASK-002-wrapper-strategy.md
   - Commit with message: "refactor: implement [chosen strategy] architecture (TASK-002)"

This is a critical decision task - take time to analyze before implementing.
```

---

### TASK-003: Clean Unused Code

```
Read the task specification in docs/tasks/TASK-003-clean-unused-code.md and clean up the codebase.

Prerequisites: TASK-002 must be completed first.

Your objectives:
1. Read the wrapper strategy decision from TASK-002
2. Based on that decision, clean up unused code as specified
3. Run all tests to ensure nothing breaks
4. Verify build succeeds and bundle size is reduced
5. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-003 as ✅ Completed
   - Delete docs/tasks/TASK-003-clean-unused-code.md
   - Commit with message: "chore: remove unused code based on wrapper strategy (TASK-003)"

Ensure all tests pass before marking complete.
```

---

## 📦 Phase 2: Foundation (Can run in parallel after Phase 1)

### TASK-004: Session Persistence

```
Read the task specification in docs/tasks/TASK-004-session-persistence.md and implement session save/load functionality.

Prerequisites: TASK-002 must be completed first.

Your objectives:
1. Implement SessionPersistence service with all operations (save, load, list, delete)
2. Add CLI commands for session management
3. Add interactive session commands (/save, /load, etc.)
4. Write comprehensive tests
5. Update documentation with examples
6. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-004 as ✅ Completed
   - Delete docs/tasks/TASK-004-session-persistence.md
   - Commit with message: "feat: add session persistence and management (TASK-004)"

This task can run in parallel with TASK-005, TASK-006, TASK-010, TASK-012.
```

---

### TASK-005: Configuration Management

```
Read the task specification in docs/tasks/TASK-005-configuration-management.md and implement comprehensive config system.

Prerequisites: TASK-002 must be completed first.

Your objectives:
1. Implement enhanced ConfigManager with file/env/CLI support
2. Add config priority system (CLI > env > file > defaults)
3. Add config commands (get, set, list, reset)
4. Support ~/.maestrorc.json
5. Add validation and schema
6. Write tests for all scenarios
7. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-005 as ✅ Completed
   - Unblock tasks: TASK-007, TASK-009, TASK-011, TASK-014
   - Delete docs/tasks/TASK-005-configuration-management.md
   - Commit with message: "feat: add configuration management system (TASK-005)"

This task can run in parallel with TASK-004, TASK-006, TASK-010, TASK-012.
```

---

### TASK-006: Enhanced Error Handling

```
Read the task specification in docs/tasks/TASK-006-enhanced-error-handling.md and implement comprehensive error handling.

Prerequisites: TASK-002 must be completed first.

Your objectives:
1. Implement retry mechanism for transient failures
2. Add error recovery suggestions
3. Improve error categorization
4. Add detailed error context
5. Make error messages user-friendly
6. Write tests for error scenarios
7. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-006 as ✅ Completed
   - Delete docs/tasks/TASK-006-enhanced-error-handling.md
   - Commit with message: "feat: enhanced error handling and recovery (TASK-006)"

This task can run in parallel with TASK-004, TASK-005, TASK-010, TASK-012.
```

---

## 🚀 Phase 3: Advanced Features

### TASK-007: Middleware System

```
Read the task specification in docs/tasks/TASK-007-middleware-system.md and implement middleware system.

Prerequisites: TASK-005 must be completed first.

Your objectives:
1. Implement Middleware interface and MiddlewareManager
2. Add before/after hooks
3. Create example middlewares (translation, context, analytics)
4. Integrate with Maestro orchestrator
5. Write comprehensive tests
6. Document with examples
7. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-007 as ✅ Completed
   - Unblock tasks: TASK-008, TASK-013
   - Delete docs/tasks/TASK-007-middleware-system.md
   - Commit with message: "feat: add middleware system (TASK-007)"

This enables plugin system and analytics.
```

---

### TASK-008: Plugin System

```
Read the task specification in docs/tasks/TASK-008-plugin-system.md and implement full plugin system.

Prerequisites: TASK-007 must be completed first.

Your objectives:
1. Implement MaestroPlugin interface and PluginManager
2. Add dynamic plugin loading from file/npm
3. Implement plugin lifecycle (load, register, unload)
4. Create at least 2 example plugins
5. Add CLI commands for plugin management
6. Write tests
7. Document plugin development guide
8. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-008 as ✅ Completed
   - Delete docs/tasks/TASK-008-plugin-system.md
   - Commit with message: "feat: add plugin system (TASK-008)"

This is a major feature - be thorough.
```

---

### TASK-009: History Search & Management

```
Read the task specification in docs/tasks/TASK-009-history-search.md and implement history features.

Prerequisites: TASK-005 must be completed first.

Your objectives:
1. Implement HistoryManager with search, filter, export
2. Add full-text search functionality
3. Add filtering by agent, date, type
4. Support export to JSON/Markdown/Text
5. Add session commands (/search, /history, /export)
6. Write tests
7. Document with examples
8. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-009 as ✅ Completed
   - Delete docs/tasks/TASK-009-history-search.md
   - Commit with message: "feat: add history search and management (TASK-009)"

This task can run in parallel with TASK-007, TASK-011, TASK-014.
```

---

## 🎨 Phase 4: UI/UX

### TASK-010: Enhanced Status Display

```
Read the task specification in docs/tasks/TASK-010-enhanced-status-display.md and improve status UI.

Prerequisites: TASK-002 must be completed first.

Your objectives:
1. Implement enhanced session status header
2. Add progress bars for long operations
3. Improve visual hierarchy
4. Make it customizable via config
5. Ensure it looks good in different terminals
6. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-010 as ✅ Completed
   - Delete docs/tasks/TASK-010-enhanced-status-display.md
   - Commit with message: "feat: enhanced status display (TASK-010)"

This task can run in parallel with other Phase 2/3 tasks.
```

---

### TASK-011: Command Palette

```
Read the task specification in docs/tasks/TASK-011-command-palette.md and implement interactive palette.

Prerequisites: TASK-005 must be completed first.

Your objectives:
1. Implement CommandPalette with inquirer
2. Add quick actions menu
3. Integrate session management
4. Add settings editor
5. Bind to keyboard shortcut (Ctrl+P)
6. Write tests
7. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-011 as ✅ Completed
   - Delete docs/tasks/TASK-011-command-palette.md
   - Commit with message: "feat: add command palette (TASK-011)"

Focus on UX - make it intuitive.
```

---

### TASK-012: Real-time Streaming Improvements

```
Read the task specification in docs/tasks/TASK-012-streaming-improvements.md and enhance streaming.

Prerequisites: TASK-002 must be completed first.

Your objectives:
1. Enhance StreamProcessor to extract structured events
2. Implement StreamRenderer for rich event display
3. Add progress indicators during execution
4. Parse thinking blocks, tool use, etc.
5. Improve visual feedback
6. Write tests for event parsing
7. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-012 as ✅ Completed
   - Delete docs/tasks/TASK-012-streaming-improvements.md
   - Commit with message: "feat: streaming improvements with rich rendering (TASK-012)"

This task can run in parallel with other Phase 2/3 tasks.
```

---

## 📊 Phase 5: Analytics & Intelligence

### TASK-013: Delegation Analytics

```
Read the task specification in docs/tasks/TASK-013-delegation-analytics.md and implement analytics.

Prerequisites: TASK-004 and TASK-007 must be completed first.

Your objectives:
1. Implement DelegationAnalytics to track events
2. Calculate performance metrics (time, success rate, patterns)
3. Add report generation functionality
4. Add CLI command for viewing analytics
5. Support export to JSON/CSV
6. Write tests
7. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-013 as ✅ Completed
   - Delete docs/tasks/TASK-013-delegation-analytics.md
   - Commit with message: "feat: delegation analytics and reporting (TASK-013)"

Make the insights actionable and useful.
```

---

### TASK-014: Smart Context Injection

```
Read the task specification in docs/tasks/TASK-014-smart-context-injection.md and implement context injection.

Prerequisites: TASK-005 must be completed first.

Your objectives:
1. Implement ContextProvider for git, env, project info
2. Add smart context selection based on message
3. Integrate with Maestro message processing
4. Make it configurable via .maestrorc
5. Add option to disable
6. Write tests
7. After successful completion:
   - Update docs/tasks/README.md: Mark TASK-014 as ✅ Completed
   - Delete docs/tasks/TASK-014-smart-context-injection.md
   - Commit with message: "feat: smart context injection (TASK-014)"

Balance between helpful and not overwhelming.
```

---

## 🔄 General Workflow

For any task:

1. **Read** the task file completely
2. **Understand** requirements and acceptance criteria
3. **Check** dependencies are met
4. **Implement** the solution
5. **Test** thoroughly
6. **Document** changes
7. **Update** README.md status
8. **Delete** task file
9. **Commit** with proper message

---

## 🎯 Parallel Execution Strategy

You can run these tasks **in parallel** if there are no conflicts:

**Immediately** (Independent):
- TASK-001

**After Phase 1** (Can run together):
- TASK-004, TASK-005, TASK-006, TASK-010, TASK-012

**After TASK-005** (Can run together):
- TASK-007, TASK-009, TASK-011, TASK-014

**After TASK-007** (Can run together):
- TASK-008, TASK-013 (also needs TASK-004)

---

## 📝 Notes for Agents

- Always read the full task file first
- Check dependencies before starting
- Run all tests before marking complete
- Update the main README.md status table
- Delete the task file only after successful completion
- Use proper commit messages with task IDs
- If blocked, note it in README.md instead of deleting

---

## ✅ Success Checklist

For each task, ensure:
- [ ] All acceptance criteria met
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Documentation updated
- [ ] README.md status updated
- [ ] Task file deleted
- [ ] Proper commit message
- [ ] Dependencies unblocked (if applicable)
