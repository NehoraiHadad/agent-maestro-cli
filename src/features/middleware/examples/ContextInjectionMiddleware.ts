/**
 * ContextInjectionMiddleware - Injects additional context into messages
 * Demonstrates message enrichment with system information
 */

import type { Middleware, MiddlewareContext } from '../types.js';
import os from 'os';
import path from 'path';

export interface ContextInjectionOptions {
  /** Include system information */
  includeSystem?: boolean;
  /** Include project information */
  includeProject?: boolean;
  /** Include timestamp */
  includeTimestamp?: boolean;
  /** Custom context to inject */
  customContext?: Record<string, unknown>;
}

/**
 * Context injection middleware for enriching messages with system/project context
 */
export class ContextInjectionMiddleware implements Middleware {
  readonly name = 'context-injection';
  readonly description = 'Inject system and project context into messages';
  readonly priority = 5; // Medium priority

  private options: Required<ContextInjectionOptions>;

  constructor(options: ContextInjectionOptions = {}) {
    this.options = {
      includeSystem: options.includeSystem ?? false,
      includeProject: options.includeProject ?? false,
      includeTimestamp: options.includeTimestamp ?? false,
      customContext: options.customContext ?? {},
    };
  }

  /**
   * Before hook - inject context into message
   */
  async before(message: string, context: MiddlewareContext): Promise<string> {
    const contextParts: string[] = [];

    // Add timestamp
    if (this.options.includeTimestamp) {
      const timestamp = new Date(context.timestamp).toISOString();
      contextParts.push(`[Timestamp: ${timestamp}]`);
    }

    // Add system information
    if (this.options.includeSystem) {
      const systemInfo = this.getSystemInfo();
      contextParts.push(`[System: ${systemInfo}]`);
    }

    // Add project information
    if (this.options.includeProject) {
      const projectInfo = await this.getProjectInfo();
      if (projectInfo) {
        contextParts.push(`[Project: ${projectInfo}]`);
      }
    }

    // Add custom context
    if (Object.keys(this.options.customContext).length > 0) {
      const customContext = JSON.stringify(this.options.customContext);
      contextParts.push(`[Context: ${customContext}]`);
    }

    // Prepend context to message if any
    if (contextParts.length > 0) {
      return `${contextParts.join(' ')}\n\n${message}`;
    }

    return message;
  }

  /**
   * Get system information
   */
  private getSystemInfo(): string {
    const platform = os.platform();
    const arch = os.arch();
    const nodeVersion = process.version;

    return `${platform}/${arch}, Node ${nodeVersion}`;
  }

  /**
   * Get project information
   */
  private async getProjectInfo(): Promise<string | null> {
    try {
      const cwd = process.cwd();
      const projectName = path.basename(cwd);

      return `${projectName} (${cwd})`;
    } catch (error) {
      return null;
    }
  }
}
