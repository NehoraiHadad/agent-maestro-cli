# AgentMaestro v2.0 - Refactoring Specifications

## Overview
Complete TypeScript refactoring with modular architecture.
Target: 100-200 lines per file, strict typing, feature-based structure.

---

## 1. Streaming Feature Module

**Location**: `src/features/streaming/`

### 1.1 parsers/BaseParser.ts (60-80 lines)
```typescript
// Abstract base class for all parsers
export abstract class BaseParser {
  abstract parseEvent(event: StreamEvent): StatusUpdate | null;
  abstract extractStatus(event: StreamEvent): string | null;
  abstract extractResponse(event: StreamEvent): string | null;

  // Helper: check if event has specific type
  protected hasType(event: StreamEvent, type: string): boolean;
}
```

**Imports**:
- `import type { StreamEvent, StatusUpdate } from '../../../shared/types/index.js';`

---

### 1.2 parsers/CodexParser.ts (100-120 lines)
```typescript
// Parses Codex JSONL streaming events
export class CodexParser extends BaseParser {
  parseEvent(event: CodexStreamEvent): StatusUpdate | null;
  extractStatus(event: CodexStreamEvent): string | null;
  extractResponse(event: CodexStreamEvent): string | null;

  // Private helpers:
  private extractCommandInfo(command: string): string;
  private parseFileOperation(command: string): string | null;
}
```

**Logic**:
- `turn.started` → "starting..."
- `item.started` + `command_execution` → extract command details
  - `sed`, `cat`, `head`, `tail` → "reading: filename"
  - `grep`, `find`, `ls` → "searching files..."
  - `vim`, `nano`, `edit` → "editing file..."
- `item.completed` + `reasoning` → "thinking: text..."
- `item.completed` + `tool_call` → "using tool: name"
- `item.completed` + `agent_message` → extract response text
- `turn.completed` → "completed"

**Imports**:
- `import type { CodexStreamEvent } from '../../../shared/types/index.js';`
- `import { truncate, getFilename } from '../../../shared/utils/index.js';`

---

### 1.3 parsers/ClaudeParser.ts (80-100 lines)
```typescript
export class ClaudeParser extends BaseParser {
  parseEvent(event: ClaudeStreamEvent): StatusUpdate | null;
  extractStatus(event: ClaudeStreamEvent): string | null;
  extractResponse(event: ClaudeStreamEvent): string | null;
}
```

**Logic**:
- `system` + `subtype: init` → "initializing..."
- `assistant` + `message` → "responding..."
- Extract content from `message.content` (array or string)
- `result` → "completed"

---

### 1.4 parsers/GeminiParser.ts (70-90 lines)
```typescript
export class GeminiParser extends BaseParser {
  parseEvent(event: GeminiStreamEvent): StatusUpdate | null;
  extractStatus(event: GeminiStreamEvent): string | null;
  extractResponse(event: GeminiStreamEvent): string | null;
}
```

**Logic**:
- `init` → "initializing..."
- `message` → "thinking..."
- `tool_use` + `tool.name` → "using tool: name"
- `tool_result` → "processing tool result..."
- `result` → extract response, return "completed"
- `error` → "error occurred"

---

### 1.5 parsers/ParserFactory.ts (40-50 lines)
```typescript
export class ParserFactory {
  static createParser(agentName: AgentName): BaseParser {
    const parsers = {
      codex: () => new CodexParser(),
      claude: () => new ClaudeParser(),
      gemini: () => new GeminiParser()
    };
    return parsers[agentName]();
  }
}
```

---

### 1.6 StreamProcessor.ts (100-120 lines)
```typescript
// Main processor that uses parsers
export class StreamProcessor {
  private parserFactory: ParserFactory;

  constructor();

  processEvent(agentName: AgentName, eventData: string): StatusUpdate | null;
  extractResponse(agentName: AgentName, eventData: string): string | null;

  // Private:
  private parseJSONEvent(data: string): StreamEvent | null;
}
```

**Logic**:
- Get parser from factory
- Parse JSON event safely
- Delegate to appropriate parser
- Return status update with timestamp

---

### 1.7 EventNormalizer.ts (80-100 lines)
```typescript
// Normalizes events to common format
export class EventNormalizer {
  normalizeEvent(raw: string): StreamEvent | null;
  parseJSONL(buffer: string): StreamEvent[];

  // Private:
  private sanitizeJSON(str: string): string;
}
```

**Logic**:
- Split buffer by newlines
- Try parsing each line as JSON
- Handle parsing errors gracefully
- Return normalized events

---

### 1.8 index.ts
```typescript
export * from './parsers/BaseParser.js';
export * from './parsers/CodexParser.js';
export * from './parsers/ClaudeParser.js';
export * from './parsers/GeminiParser.js';
export * from './parsers/ParserFactory.js';
export * from './StreamProcessor.js';
export * from './EventNormalizer.js';
```

---

## 2. Delegation Feature Module

**Location**: `src/features/delegation/`

### 2.1 Delegator.ts (140-160 lines)
```typescript
// Main delegation orchestrator
export class Delegator {
  private ptyManager: PTYManager;
  private protocolService: ProtocolService;
  private currentDepth: number;
  private maxDepth: number;

  constructor(config: DelegationConfig);

  async execute(
    agent: Agent,
    prompt: string,
    options?: DelegationOptions
  ): Promise<string>;

  async executeParallel(requests: DelegationRequest[]): Promise<string[]>;

  getDepth(): number;
  reset(): void;
  cleanup(): void;

  // Private:
  private async runDelegation(...): Promise<string>;
  private createTimeoutManager(timeout: number): TimeoutManager;
}
```

**Logic**:
- Check depth limit (throw MaxDelegationDepthError if exceeded)
- Spawn PTY process with agent command
- Setup timeout with inactivity detection
- Collect output
- Clean output using OutputFormatter
- Return formatted result

**Imports**:
- `import { PTYManager } from '../execution/pty/index.js';`
- `import { ProtocolService } from '../../domain/index.js';`
- `import type { Agent, DelegationOptions } from '../../shared/types/index.js';`

---

### 2.2 RequestValidator.ts (60-80 lines)
```typescript
// Validates delegation requests
export class RequestValidator {
  validate(request: DelegationRequest): ValidationResult;
  validateAgent(agentName: string): boolean;
  validatePrompt(prompt: string): boolean;
  validatePriority(priority: string): boolean;

  // Private:
  private checkRequiredFields(request: unknown): string[];
}
```

**Returns**: `{ valid: boolean, errors: string[] }`

---

### 2.3 ResultFormatter.ts (70-90 lines)
```typescript
// Formats delegation results
export class ResultFormatter {
  format(agent: string, result: string, success: boolean): string;
  formatError(agent: string, error: Error): string;
  formatTimeout(agent: string, timeout: number): string;

  // Private:
  private createSeparator(length: number): string;
  private wrapResult(content: string): string;
}
```

**Format**:
```
[MAESTRO_RESULT] or [MAESTRO_ERROR]
Agent: AgentName
============================================================
Result content here
============================================================
```

---

### 2.4 TimeoutManager.ts (80-100 lines)
```typescript
// Manages inactivity timeout
export class TimeoutManager {
  private timeoutId: NodeJS.Timeout | null;
  private timeoutMs: number;
  private onTimeout: () => void;

  constructor(timeoutMs: number, onTimeout: () => void);

  start(): void;
  reset(): void;
  clear(): void;

  isActive(): boolean;
}
```

---

### 2.5 index.ts
```typescript
export * from './Delegator.js';
export * from './RequestValidator.js';
export * from './ResultFormatter.js';
export * from './TimeoutManager.js';
```

---

## 3. Output Feature Module

**Location**: `src/features/output/`

### 3.1 cleaners/AnsiCleaner.ts (60-80 lines)
```typescript
// Removes ANSI escape codes
export class AnsiCleaner {
  clean(text: string): string;

  // Private:
  private removeEscapeCodes(text: string): string;
  private removeColorCodes(text: string): string;
  private removeCursorCodes(text: string): string;
}
```

**Patterns**:
- `\x1B\[[0-9;]*[JKmsu]` - general ANSI
- `\x1B\][0-9;]*;[^\x07]*\x07` - OSC sequences
- `\x1B\[[^m]*m` - color codes
- `\x1B\[[\d;]*[a-zA-Z]` - cursor movement

---

### 3.2 cleaners/MetadataCleaner.ts (80-100 lines)
```typescript
// Removes agent metadata
export class MetadataCleaner {
  clean(text: string, agentName: AgentName): string;

  // Private:
  private cleanCodexMetadata(text: string): string;
  private cleanClaudeMetadata(text: string): string;
  private cleanGeminiMetadata(text: string): string;
}
```

**Codex patterns**:
- Remove: `OpenAI Codex v[version]...` header
- Remove: `tokens used\n[number]` footer
- Remove: `codex\n` label at start

**Gemini patterns**:
- Remove: `Loaded cached credentials.`

**Claude patterns**:
- (Add if needed)

---

### 3.3 cleaners/DelegationCleaner.ts (50-70 lines)
```typescript
// Removes delegation protocol strings
export class DelegationCleaner {
  clean(text: string): string;

  // Private:
  private removeDelegationRequests(text: string): string;
  private removeDelegationResults(text: string): string;
}
```

**Remove**:
- `MAESTRO_DELEGATE::{...}`
- `[MAESTRO_RESULT]` blocks
- `[MAESTRO_ERROR]` blocks

---

### 3.4 OutputFormatter.ts (100-120 lines)
```typescript
// Main output formatter - orchestrates cleaners
export class OutputFormatter {
  private ansiCleaner: AnsiCleaner;
  private metadataCleaner: MetadataCleaner;
  private delegationCleaner: DelegationCleaner;

  constructor();

  format(text: string, agentName: AgentName): string;
  formatForDisplay(text: string, agentName: AgentName): string;
  formatForLogging(text: string, agentName: AgentName): string;

  // Private:
  private cleanLineBreaks(text: string): string;
  private trim(text: string): string;
}
```

**Pipeline**:
1. Remove ANSI codes
2. Remove agent metadata
3. Remove delegation protocol
4. Clean line breaks (max 2 consecutive \n)
5. Trim

---

### 3.5 index.ts
```typescript
export * from './cleaners/AnsiCleaner.js';
export * from './cleaners/MetadataCleaner.js';
export * from './cleaners/DelegationCleaner.js';
export * from './OutputFormatter.js';
```

---

## 4. UI Feature Module

**Location**: `src/features/ui/`

### 4.1 spinner/Spinner.ts (100-120 lines)
```typescript
// Wraps ora spinner with custom functionality
import ora from 'ora';
import chalk from 'chalk';

export class Spinner {
  private spinner: any; // ora instance
  private startTime: number | null;

  start(text: string, color?: string): this;
  update(text: string, color?: string): this;
  succeed(text: string): this;
  fail(text: string): this;
  warn(text: string): this;
  stop(): this;

  // Private:
  private formatWithDuration(text: string): string;
  private getDuration(): string;
}
```

---

### 4.2 spinner/StatusUpdater.ts (80-100 lines)
```typescript
// Updates spinner based on agent status
export class StatusUpdater {
  private spinner: Spinner | null;
  private lastStatus: string;

  constructor(spinner?: Spinner);

  update(agentName: string, status: string, color?: string): void;
  reset(): void;

  // Private:
  private shouldUpdate(newStatus: string): boolean;
  private formatStatus(agentName: string, status: string): string;
}
```

---

### 4.3 logger/ConsoleLogger.ts (120-140 lines)
```typescript
// Console logging with colors
import chalk from 'chalk';

export class ConsoleLogger {
  private level: LogLevel;

  constructor(level?: LogLevel);

  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  success(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;

  maestro(message: string, ...args: unknown[]): void;
  delegation(agentName: string, message: string, ...args: unknown[]): void;
  agent(agentName: string, message: string, color?: string): void;

  separator(char?: string, length?: number): void;
  header(text: string): void;
  box(text: string, color?: string): void;

  setLevel(level: LogLevel): void;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4
}
```

---

### 4.4 logger/FileLogger.ts (100-120 lines)
```typescript
// File-based logging
import { promises as fs } from 'fs';

export class FileLogger {
  private filePath: string;
  private buffer: string[];
  private flushInterval: NodeJS.Timeout | null;

  constructor(filePath: string, autoFlush?: boolean);

  log(level: string, message: string, metadata?: Record<string, unknown>): void;
  flush(): Promise<void>;
  clear(): Promise<void>;

  // Private:
  private formatLogEntry(level: string, message: string, metadata?: Record<string, unknown>): string;
  private startAutoFlush(): void;
  private stopAutoFlush(): void;
}
```

---

### 4.5 menu/InteractiveMenu.ts (100-120 lines)
```typescript
// Interactive CLI menu using inquirer
import inquirer from 'inquirer';
import type { Agent } from '../../../shared/types/index.js';

export class InteractiveMenu {
  async selectAgent(agents: Agent[]): Promise<string>;
  async confirm(message: string): Promise<boolean>;
  async input(message: string, defaultValue?: string): Promise<string>;

  // Private:
  private formatAgentChoice(agent: Agent): { name: string; value: string };
}
```

---

### 4.6 index.ts
```typescript
export * from './spinner/Spinner.js';
export * from './spinner/StatusUpdater.js';
export * from './logger/ConsoleLogger.js';
export * from './logger/FileLogger.js';
export * from './menu/InteractiveMenu.js';
```

---

## 5. Orchestration Feature Module

**Location**: `src/features/orchestration/`

### 5.1 Maestro.ts (150-180 lines)
```typescript
// Main orchestrator - coordinates all features
export class Maestro {
  private primaryAgent: Agent;
  private config: MaestroConfig;
  private ptyManager: PTYManager;
  private delegator: Delegator;
  private streamProcessor: StreamProcessor;
  private outputFormatter: OutputFormatter;
  private agentRepository: AgentRepository;
  private isRunning: boolean;

  constructor(primaryAgentName: AgentName, config?: MaestroConfig);

  async start(): Promise<void>;
  async sendMessage(message: string): Promise<AgentExecutionResult>;
  async stop(): Promise<void>;

  getAvailableAgents(): Agent[];
  getStats(): MaestroStats;

  // Private:
  private async executePrimaryAgent(message: string): Promise<AgentExecutionResult>;
  private async processDelegation(line: string): Promise<void>;
  private setupEventHandlers(processId: string): void;
}
```

**Key responsibilities**:
- Initialize all subsystems (PTY, Delegator, StreamProcessor, etc.)
- Execute primary agent with streaming
- Detect and handle delegation requests
- Update spinner with streaming status
- Format final output
- Cleanup on exit

---

### 5.2 SessionManager.ts (100-120 lines)
```typescript
// Manages conversation session
export class SessionManager {
  private messages: Message[];
  private sessionId: string;
  private startTime: Date;

  constructor();

  addUserMessage(content: string): Message;
  addAssistantMessage(content: string, agentName: string): Message;
  addDelegationMessage(from: string, to: string, result: string): Message;

  getMessages(): Message[];
  getHistory(): Message[];
  clearSession(): void;

  getSummary(): SessionSummary;
  export(): SessionExport;
}
```

---

### 5.3 ConfigManager.ts (80-100 lines)
```typescript
// Manages Maestro configuration
export class ConfigManager {
  private config: MaestroConfig;

  constructor(config?: Partial<MaestroConfig>);

  get<K extends keyof MaestroConfig>(key: K): MaestroConfig[K];
  set<K extends keyof MaestroConfig>(key: K, value: MaestroConfig[K]): void;

  validate(): ValidationResult;

  static getDefaults(): MaestroConfig;
}

export interface MaestroConfig {
  inactivityTimeout: number;
  maxDelegationDepth: number;
  showSpinner: boolean;
  verbose: boolean;
}
```

---

### 5.4 index.ts
```typescript
export * from './Maestro.js';
export * from './SessionManager.js';
export * from './ConfigManager.js';
```

---

## 6. CLI Layer

**Location**: `src/cli/`

### 6.1 index.ts (80-100 lines)
```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { StartCommand } from './commands/StartCommand.js';
import { ListCommand } from './commands/ListCommand.js';
import { InfoCommand } from './commands/InfoCommand.js';

const program = new Command();

program
  .name('maestro')
  .description('🎭 Multi-agent AI orchestration CLI')
  .version('2.0.0');

// Register commands
StartCommand.register(program);
ListCommand.register(program);
InfoCommand.register(program);

program.parse(process.argv);
```

---

### 6.2 commands/StartCommand.ts (120-140 lines)
```typescript
// Start orchestration command
export class StartCommand {
  static register(program: Command): void {
    program
      .option('-a, --agent <name>', 'specify primary agent')
      .option('-v, --verbose', 'enable verbose logging')
      .option('--no-spinner', 'disable loading spinners')
      .option('--timeout <ms>', 'delegation timeout', '60000')
      .option('--max-depth <n>', 'max delegation depth', '3')
      .action(async (options) => {
        await this.execute(options);
      });
  }

  static async execute(options: CommandOptions): Promise<void>;

  // Private:
  private static async selectAgent(): Promise<string>;
  private static async checkAvailability(agentName: string): Promise<boolean>;
}
```

**Flow**:
1. Get agent name (from option or interactive menu)
2. Check agent availability
3. Create Maestro instance
4. Start orchestration
5. Handle errors gracefully

---

### 6.3 commands/ListCommand.ts (80-100 lines)
```typescript
// List agents command
export class ListCommand {
  static register(program: Command): void {
    program
      .command('list')
      .description('list all available agents')
      .action(async () => {
        await this.execute();
      });
  }

  static async execute(): Promise<void>;

  // Private:
  private static async checkAgentAvailability(agent: Agent): Promise<boolean>;
  private static formatAgentInfo(agent: Agent, available: boolean): void;
}
```

**Output**:
```
🎭 Available Agents

Claude Code ✓ installed
  Anthropic Claude - Best for codebase navigation...
  Package: @anthropic-ai/claude-code
  Command: claude

Gemini CLI ✗ not installed
  ...
```

---

### 6.4 commands/InfoCommand.ts (90-110 lines)
```typescript
// Info about specific agent command
export class InfoCommand {
  static register(program: Command): void {
    program
      .command('info <agent>')
      .description('show information about a specific agent')
      .action(async (agentName: string) => {
        await this.execute(agentName);
      });
  }

  static async execute(agentName: string): Promise<void>;

  // Private:
  private static displayAgentInfo(agent: Agent, available: boolean): void;
}
```

**Output**:
```
🎭 Claude Code

Description:
  Anthropic Claude - Best for...

Status:
  ✓ Installed

Package:
  @anthropic-ai/claude-code

Command:
  claude

Capabilities:
  • Code refactoring
  • Codebase analysis
  ...

Authentication:
  Claude Pro/Max subscription
```

---

### 6.5 index.ts
```typescript
export * from './commands/StartCommand.js';
export * from './commands/ListCommand.js';
export * from './commands/InfoCommand.js';
```

---

## General Requirements

### All Files Must:
1. Use TypeScript with strict mode
2. Be 60-200 lines (prefer 100-150)
3. Have clear single responsibility
4. Include JSDoc comments for public methods
5. Import from index.ts files (e.g., `from '../../shared/index.js'`)
6. Use proper error handling
7. Follow naming conventions:
   - Files: PascalCase.ts
   - Classes: PascalCase
   - Methods: camelCase
   - Constants: UPPER_SNAKE_CASE

### Import Patterns:
```typescript
// Shared layer
import { ErrorClass } from '../../shared/errors/index.js';
import type { TypeName } from '../../shared/types/index.js';
import { CONSTANT } from '../../shared/constants/index.js';
import { utilFunction } from '../../shared/utils/index.js';

// Domain layer
import { Agent, Message } from '../../domain/entities/index.js';
import { AgentRepository } from '../../domain/repositories/index.js';
import { ProtocolService } from '../../domain/services/index.js';

// Features
import { PTYManager } from '../execution/pty/index.js';
import { StreamProcessor } from '../streaming/index.js';
```

### Error Handling:
```typescript
try {
  // operation
} catch (error) {
  if (error instanceof SpecificError) {
    // handle specific
  }
  throw new CustomError('message', context);
}
```

---

## Build Verification

After all files are created:

```bash
npm run build
```

Should compile successfully with no errors.

---

## Summary

Total new files to create:
- Streaming: 8 files (~700 lines)
- Delegation: 5 files (~450 lines)
- Output: 5 files (~400 lines)
- UI: 6 files (~650 lines)
- Orchestration: 4 files (~450 lines)
- CLI: 5 files (~480 lines)

**Total: ~33 files, ~3130 lines**

Combined with existing 30 files = **63 TypeScript files** total
Average: **~100 lines per file**
