/**
 * LoggingManager.ts
 * Centralized logging manager that coordinates console and file logging
 */

import { join } from 'path';
import { ConsoleLogger, LogLevel as ConsoleLogLevel } from '../ui/logger/ConsoleLogger.js';
import { FileLogger, type FileLoggerOptions } from '../ui/logger/FileLogger.js';
import type { LogLevel } from '../../shared/constants/index.js';
import type { AgentName } from '../../shared/types/index.js';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  sessionId?: string;
  component?: string;
  agent?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface LoggingConfig {
  enableFileLogging: boolean;
  logLevel: LogLevel;
  logDirectory: string;
  logRotation: boolean;
  maxLogFiles: number;
  maxLogSizeBytes: number;
  sessionId?: string;
}

/**
 * Centralized logging manager
 */
export class LoggingManager {
  private consoleLogger: ConsoleLogger;
  private fileLoggers: Map<string, FileLogger> = new Map();
  private config: LoggingConfig;
  private sessionId: string;
  private isInitialized: boolean = false;

  constructor(config: LoggingConfig) {
    this.config = config;
    this.sessionId = config.sessionId || this.generateSessionId();

    // Initialize console logger with appropriate level
    const consoleLevel = this.mapLogLevelToConsole(config.logLevel);
    this.consoleLogger = new ConsoleLogger(consoleLevel);
  }

  /**
   * Initialize file loggers
   */
  async initialize(): Promise<void> {
    if (!this.config.enableFileLogging || this.isInitialized) {
      return;
    }

    const fileLoggerOptions: FileLoggerOptions = {
      autoFlush: true,
      enableRotation: this.config.logRotation,
      maxFiles: this.config.maxLogFiles,
      maxSizeBytes: this.config.maxLogSizeBytes
    };

    // Create main log file
    const mainLogPath = join(this.config.logDirectory, this.getLogFileName('maestro'));
    this.fileLoggers.set('main', new FileLogger(mainLogPath, fileLoggerOptions));

    // Create delegations log file
    const delegationsLogPath = join(this.config.logDirectory, this.getLogFileName('delegations'));
    this.fileLoggers.set('delegations', new FileLogger(delegationsLogPath, fileLoggerOptions));

    // Create errors log file
    const errorsLogPath = join(this.config.logDirectory, this.getLogFileName('errors'));
    this.fileLoggers.set('errors', new FileLogger(errorsLogPath, fileLoggerOptions));

    this.isInitialized = true;

    // Log initialization
    this.info('LoggingManager', 'Logging system initialized', {
      sessionId: this.sessionId,
      logDirectory: this.config.logDirectory,
      logLevel: this.config.logLevel
    });
  }

  /**
   * Log debug message
   */
  debug(component: string, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;

    this.consoleLogger.debug(message);
    this.logToFile('main', 'debug', component, message, metadata);
  }

  /**
   * Log info message
   */
  info(component: string, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;

    this.consoleLogger.info(message);
    this.logToFile('main', 'info', component, message, metadata);
  }

  /**
   * Log success message
   */
  success(component: string, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;

    this.consoleLogger.success(message);
    this.logToFile('main', 'info', component, message, metadata);
  }

  /**
   * Log warning message
   */
  warn(component: string, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;

    this.consoleLogger.warn(message);
    this.logToFile('main', 'warn', component, message, metadata);
  }

  /**
   * Log error message
   */
  error(component: string, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;

    this.consoleLogger.error(message);
    this.logToFile('main', 'error', component, message, metadata);
    this.logToFile('errors', 'error', component, message, metadata);
  }

  /**
   * Log delegation event
   */
  logDelegation(
    fromAgent: AgentName,
    toAgent: AgentName,
    task: string,
    status: 'started' | 'completed' | 'failed',
    metadata?: Record<string, unknown>
  ): void {
    const message = `Delegation ${status}: ${fromAgent} -> ${toAgent}`;
    const fullMetadata = {
      ...metadata,
      fromAgent,
      toAgent,
      task: task.substring(0, 200), // Truncate long tasks
      status
    };

    this.info('Delegation', message, fullMetadata);
    this.logToFile('delegations', 'info', 'Delegation', message, fullMetadata);
  }

  /**
   * Log agent execution
   */
  logAgentExecution(
    agent: AgentName,
    status: 'started' | 'completed' | 'failed',
    metadata?: Record<string, unknown>
  ): void {
    const message = `Agent ${agent} execution ${status}`;
    const fullMetadata = { ...metadata, agent, status };

    if (status === 'failed') {
      this.error('AgentExecution', message, fullMetadata);
    } else {
      this.info('AgentExecution', message, fullMetadata);
    }
  }

  /**
   * Log session event
   */
  logSession(event: 'started' | 'ended', metadata?: Record<string, unknown>): void {
    const message = `Session ${event}`;
    const fullMetadata = { ...metadata, sessionId: this.sessionId };

    this.info('Session', message, fullMetadata);
  }

  /**
   * Log user message
   */
  logUserMessage(message: string): void {
    this.logToFile('main', 'info', 'User', `User message: ${message.substring(0, 200)}`, {
      fullMessage: message
    });
  }

  /**
   * Log agent response
   */
  logAgentResponse(agent: AgentName, response: string): void {
    this.logToFile('main', 'info', 'AgentResponse', `${agent} response`, {
      agent,
      responseLength: response.length,
      preview: response.substring(0, 200)
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    sessionId: string;
    logDirectory: string;
    fileLogging: boolean;
    logLevel: string;
  } {
    return {
      sessionId: this.sessionId,
      logDirectory: this.config.logDirectory,
      fileLogging: this.config.enableFileLogging,
      logLevel: this.config.logLevel
    };
  }

  /**
   * Flush all file loggers
   */
  async flush(): Promise<void> {
    const flushPromises: Promise<void>[] = [];
    for (const logger of this.fileLoggers.values()) {
      flushPromises.push(logger.flush());
    }
    await Promise.all(flushPromises);
  }

  /**
   * Close all loggers
   */
  async close(): Promise<void> {
    this.logSession('ended');

    const closePromises: Promise<void>[] = [];
    for (const logger of this.fileLoggers.values()) {
      closePromises.push(logger.close());
    }

    await Promise.all(closePromises);
    this.fileLoggers.clear();
    this.isInitialized = false;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= configLevelIndex;
  }

  /**
   * Log to file logger
   */
  private logToFile(
    loggerName: string,
    level: LogLevel,
    component: string,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enableFileLogging) return;

    const logger = this.fileLoggers.get(loggerName);
    if (!logger) return;

    logger.log(level.toUpperCase(), message, {
      sessionId: this.sessionId,
      component,
      ...metadata
    });
  }

  /**
   * Map log level to console log level enum
   */
  private mapLogLevelToConsole(level: LogLevel): ConsoleLogLevel {
    const mapping: Record<LogLevel, ConsoleLogLevel> = {
      'debug': ConsoleLogLevel.DEBUG,
      'info': ConsoleLogLevel.INFO,
      'warn': ConsoleLogLevel.WARN,
      'error': ConsoleLogLevel.ERROR
    };
    return mapping[level];
  }

  /**
   * Generate log file name with date
   */
  private getLogFileName(baseName: string): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${baseName}-${date}.log`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * Get console logger for direct access
   */
  getConsoleLogger(): ConsoleLogger {
    return this.consoleLogger;
  }
}
