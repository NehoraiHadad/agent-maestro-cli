# TASK-014: Smart Context Injection

**Status**: 🔴 Not Started  
**Priority**: P3  
**Estimated Time**: 8 hours  
**Dependencies**: TASK-005  

---

## 📋 Description

Automatically inject relevant context (git, env, project info) into messages.

## 🎯 Objectives

1. Git context provider (branch, commits, status)
2. Environment context (env vars, config)
3. Project context (package.json, README)
4. Smart context selection
5. Configurable context injection

## 📝 Implementation

```typescript
// src/features/context/ContextProvider.ts
export class ContextProvider {
  async getGitContext(): Promise<GitContext>;
  async getEnvContext(): Promise<EnvContext>;
  async getProjectContext(): Promise<ProjectContext>;
  async getRelevantContext(message: string): Promise<Context>;
}

// Integration with Maestro
export class SmartContextInjector {
  async enrichMessage(message: string): Promise<string> {
    const context = await this.provider.getRelevantContext(message);
    return this.formatter.inject(message, context);
  }
}
```

## 💡 Context Examples

**Git Context**:
```
[Git: main branch, 3 uncommitted files]
```

**Project Context**:
```
[Project: agent-maestro-cli v2.1.0, TypeScript]
```

**Environment**:
```
[Env: Node 20.x, Linux]
```

## ✅ Acceptance Criteria

- [ ] Git context extraction
- [ ] Env context extraction
- [ ] Project context extraction
- [ ] Smart selection based on message
- [ ] Configurable via .maestrorc
- [ ] Option to disable
- [ ] Tests

## 🔄 Post-Completion

Commit: "feat: smart context injection (TASK-014)"
