# TASK-002: Decide & Implement Wrapper Strategy

**Status**: 🔴 Not Started
**Priority**: P0 (Critical - Blocks other tasks)
**Estimated Time**: 4-6 hours
**Assignee**: TBD
**Created**: 2025-11-18
**Dependencies**: None
**Blocks**: TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008
**Can Run in Parallel**: No (Critical decision task)

---

## 📋 Description

Make a strategic decision about AgentMaestro's core architecture: Should it be a **pure wrapper** for Claude Code only, or a **hybrid system** that also supports direct access to Codex/Gemini?

## 🎯 Objectives

1. Analyze both approaches (Pure Wrapper vs Hybrid)
2. Make informed decision based on project goals
3. Document the chosen strategy
4. Implement the chosen approach
5. Update README and documentation

## 🤔 Decision Points

### Option A: Pure Wrapper (Recommended)

**Concept**: Maestro wraps only Claude Code. All other agents accessed via Claude's Subagent system.

**Pros**:
- ✅ Simpler architecture
- ✅ Less code to maintain
- ✅ Clear separation of concerns
- ✅ Leverages Claude's native delegation
- ✅ No need to manage multiple agent APIs
- ✅ Consistent with current README description

**Cons**:
- ❌ Dependent on Claude Code for all operations
- ❌ Can't use Codex/Gemini without Claude
- ❌ Less flexible for direct agent selection

**Implementation**:
- Remove Codex/Gemini from AgentRepository
- Clean up unused constants
- Simplify DelegateCommand to Claude-only
- Update docs to reflect wrapper nature

### Option B: Hybrid System

**Concept**: Maestro provides direct access to all three agents (Claude, Codex, Gemini).

**Pros**:
- ✅ Direct access to each agent
- ✅ Can use Codex/Gemini without Claude
- ✅ More flexibility for users
- ✅ Better for specific use cases

**Cons**:
- ❌ More complex architecture
- ❌ Need to maintain integrations for 3 agents
- ❌ API changes require more work
- ❌ Higher maintenance burden
- ❌ Conflicts with "wrapper" concept

**Implementation**:
- Keep all agents in repository
- Implement full support for Codex/Gemini
- Add agent selection logic
- Support direct delegation

## 📍 Current State

**Mixed state**:
- README says: "Wrapper for Claude Code"
- AgentRepository only defines Claude
- DelegateCommand blocks non-Claude agents
- BUT: Constants exist for Codex/Gemini
- BUT: Agent.getExecutionArgs has Codex/Gemini logic

## ✅ Desired State

**Clear, consistent implementation** based on chosen strategy.

## 📝 Implementation Steps

### If Option A (Pure Wrapper) is chosen:

1. **Update Core Files**
   - `src/domain/repositories/AgentRepository.ts`: Remove Codex/Gemini references
   - `src/shared/constants/agents.ts`: Remove or mark as deprecated
   - `src/domain/entities/Agent.ts`: Simplify getExecutionArgs (Claude only)
   - `src/cli/commands/DelegateCommand.ts`: Keep Claude-only restriction

2. **Update Documentation**
   - `README.md`: Emphasize wrapper nature
   - Add section: "How to use Codex/Gemini via Claude Subagents"
   - Update examples

3. **Add Tests**
   - Test that only Claude is available
   - Test error when trying other agents

### If Option B (Hybrid) is chosen:

1. **Complete Agent Implementations**
   - Add Codex to AgentRepository with full config
   - Add Gemini to AgentRepository with full config
   - Implement full execution support

2. **Update Commands**
   - Remove restrictions in DelegateCommand
   - Add agent selection in StartCommand
   - Implement multi-agent orchestration

3. **Add Tests**
   - Test each agent independently
   - Test delegation between agents

## 🧪 Testing

### For Option A:
```bash
# Should work
maestro
maestro delegate claude "test"

# Should fail gracefully with clear message
maestro delegate codex "test"
maestro delegate gemini "test"
```

### For Option B:
```bash
# All should work
maestro delegate claude "test"
maestro delegate codex "test"
maestro delegate gemini "test"
```

## ✅ Acceptance Criteria

- [ ] Clear decision documented in `docs/ARCHITECTURE.md`
- [ ] Implementation matches chosen strategy
- [ ] No contradictions in code/docs
- [ ] All affected files updated
- [ ] Tests added for chosen approach
- [ ] README clearly explains the approach

## 📦 Deliverables

1. **Decision Document**: `docs/ARCHITECTURE.md`
2. **Updated Files** (based on decision)
3. **Updated README.md**
4. **Tests**

## 🚨 Risks & Considerations

- **Risk**: Choosing wrong strategy might require refactor later
- **Mitigation**: Analyze use cases thoroughly before deciding
- **Risk**: Option B requires more maintenance
- **Mitigation**: Only choose if there's real user need

## 💡 Recommendation

**Recommended: Option A (Pure Wrapper)**

**Reasoning**:
1. Aligns with current README and messaging
2. Simpler to maintain
3. Claude's Subagent system already provides delegation
4. Less code = fewer bugs
5. Clearer value proposition

## 📚 References

- Current README description
- Claude Code Subagents documentation
- AgentRepository implementation

## 🔄 Post-Completion

After completing this task:
1. Update `docs/tasks/README.md` - mark TASK-002 as ✅ Completed
2. Delete this file
3. Unblock TASK-003, TASK-004, TASK-005, TASK-006
4. Commit with message: "refactor: implement [chosen strategy] architecture (TASK-002)"
