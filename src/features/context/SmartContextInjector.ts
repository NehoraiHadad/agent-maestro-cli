/**
 * SmartContextInjector.ts
 * Middleware that enriches messages with relevant context
 */

import type { Middleware, MiddlewareContext } from '../middleware/types.js';
import { ContextProvider } from './ContextProvider.js';
import type { Context, ContextConfig } from './types.js';

/**
 * Formats context into a readable string
 */
export class ContextFormatter {
  /**
   * Format context into a concise string
   */
  static format(context: Context): string {
    const parts: string[] = [];

    // Format git context
    if (context.git?.isGitRepo) {
      const gitParts: string[] = [];

      if (context.git.branch) {
        gitParts.push(`branch: ${context.git.branch}`);
      }

      if (context.git.hasUncommittedChanges && context.git.uncommittedFiles) {
        gitParts.push(`${context.git.uncommittedFiles} uncommitted file${context.git.uncommittedFiles > 1 ? 's' : ''}`);
      }

      if (gitParts.length > 0) {
        parts.push(`Git: ${gitParts.join(', ')}`);
      }
    }

    // Format project context
    if (context.project) {
      const projectParts: string[] = [];

      if (context.project.name) {
        projectParts.push(context.project.name);
      }

      if (context.project.version) {
        projectParts.push(`v${context.project.version}`);
      }

      if (context.project.language) {
        projectParts.push(context.project.language);
      }

      if (context.project.framework) {
        projectParts.push(context.project.framework);
      }

      if (projectParts.length > 0) {
        parts.push(`Project: ${projectParts.join(', ')}`);
      }
    }

    // Format environment context
    if (context.env) {
      const envParts: string[] = [];

      if (context.env.nodeVersion) {
        envParts.push(`Node ${context.env.nodeVersion}`);
      }

      if (context.env.platform) {
        envParts.push(context.env.platform);
      }

      if (envParts.length > 0) {
        parts.push(`Env: ${envParts.join(', ')}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Inject context into message
   */
  static inject(message: string, context: Context): string {
    const contextString = this.format(context);

    if (!contextString) {
      return message;
    }

    // Add context at the beginning of the message, enclosed in brackets
    return `[Context]\n${contextString}\n\n${message}`;
  }
}

/**
 * Smart context injection middleware
 * Automatically adds relevant context to messages before sending to agent
 */
export class SmartContextInjector implements Middleware {
  readonly name = 'smart-context-injector';
  readonly description = 'Injects relevant context (git, env, project) into messages';
  readonly priority = 100; // Run early in the middleware chain

  private provider: ContextProvider;

  constructor(config?: Partial<ContextConfig>) {
    this.provider = new ContextProvider(process.cwd(), config);
  }

  /**
   * Before hook - enriches message with context
   */
  async before(message: string, _context: MiddlewareContext): Promise<string> {
    try {
      // Get relevant context based on message content
      const relevantContext = await this.provider.getRelevantContext(message);

      // Check if we have any context to inject
      const hasContext = Object.keys(relevantContext).length > 0 &&
        (relevantContext.git || relevantContext.env || relevantContext.project);

      if (!hasContext) {
        return message;
      }

      // Inject context into message
      const enrichedMessage = ContextFormatter.inject(message, relevantContext);

      return enrichedMessage;
    } catch (error) {
      // If context extraction fails, return original message
      console.error('Context injection error:', error);
      return message;
    }
  }

  /**
   * Update provider configuration
   */
  setConfig(config: Partial<ContextConfig>): void {
    this.provider.setConfig(config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextConfig {
    return this.provider.getConfig();
  }
}
