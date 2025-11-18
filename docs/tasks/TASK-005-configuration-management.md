# TASK-005: Configuration Management

**Status**: 🔴 Not Started
**Priority**: P1
**Estimated Time**: 4-6 hours
**Assignee**: TBD
**Created**: 2025-11-18
**Dependencies**: TASK-002
**Can Run in Parallel**: Yes (after Phase 1)
**Blocks**: TASK-007, TASK-009, TASK-011, TASK-014

---

## 📋 Description

Implement comprehensive configuration management system with support for config files (~/.maestrorc.json), environment variables, and CLI overrides.

## 🎯 Objectives

1. Support configuration file (~/.maestrorc.json)
2. Environment variable support
3. CLI argument override system
4. Config validation and defaults
5. Config commands (get, set, reset)

## 📍 Configuration Structure

```typescript
// ~/.maestrorc.json
{
  "defaultMode": "interactive",
  "planMode": false,
  "theme": "dark",
  "autoSave": true,
  "logLevel": "info",
  "timeout": 60000,
  "features": {
    "sessionPersistence": true,
    "analytics": false
  },
  "ui": {
    "showSpinner": true,
    "statusDisplay": "enhanced",
    "colors": true
  },
  "paths": {
    "logDirectory": "~/.maestro/logs",
    "sessionDirectory": "~/.maestro/sessions"
  }
}
```

## 📝 Implementation Steps

1. **Create Enhanced ConfigManager**
   ```typescript
   // src/features/config/ConfigManager.ts
   export class ConfigManager {
     load(path?: string): MaestroConfig;
     save(config: Partial<MaestroConfig>): void;
     get<K extends keyof MaestroConfig>(key: K): MaestroConfig[K];
     set<K extends keyof MaestroConfig>(key: K, value: MaestroConfig[K]): void;
     merge(config: Partial<MaestroConfig>): void;
     reset(): void;
     validate(): ValidationResult;
   }
   ```

2. **Add Config Loader**
   ```typescript
   // src/features/config/ConfigLoader.ts
   export class ConfigLoader {
     loadFromFile(path: string): Config;
     loadFromEnv(): Config;
     loadFromCLI(args: CLIArgs): Config;
     merge(...configs: Config[]): Config;
   }
   ```

3. **Priority Order**
   1. CLI arguments (highest priority)
   2. Environment variables
   3. User config file (~/.maestrorc.json)
   4. Defaults (lowest priority)

4. **Add CLI Commands**
   ```bash
   maestro config get <key>
   maestro config set <key> <value>
   maestro config list
   maestro config reset
   maestro config edit  # Open in $EDITOR
   ```

5. **Environment Variables**
   ```bash
   MAESTRO_LOG_LEVEL=debug
   MAESTRO_PLAN_MODE=true
   MAESTRO_TIMEOUT=120000
   MAESTRO_AUTO_SAVE=true
   ```

## 🧪 Testing

```bash
# Create config file
echo '{"defaultMode": "plan"}' > ~/.maestrorc.json

# Override with env
MAESTRO_DEFAULT_MODE=interactive maestro

# Override with CLI
maestro --plan-mode

# Config commands
maestro config get defaultMode
maestro config set autoSave true
maestro config list
```

## ✅ Acceptance Criteria

- [ ] Config file support (~/.maestrorc.json)
- [ ] Environment variable support (MAESTRO_*)
- [ ] CLI argument override
- [ ] Correct priority order
- [ ] Config validation with helpful errors
- [ ] Config commands (get, set, list, reset)
- [ ] Schema validation
- [ ] Tests for all scenarios
- [ ] Documentation

## 📦 Deliverables

1. Enhanced ConfigManager
2. ConfigLoader with priority system
3. Config validation
4. CLI commands
5. Tests
6. Documentation with examples

## 🚨 Risks & Considerations

- **Risk**: Config file corruption
- **Mitigation**: Validation before save, backup
- **Risk**: Conflicting configurations
- **Mitigation**: Clear priority documented

## 🔄 Post-Completion

1. Update docs/tasks/README.md
2. Delete this file
3. Unblock TASK-007, TASK-009, TASK-011, TASK-014
4. Commit: "feat: add configuration management system (TASK-005)"
