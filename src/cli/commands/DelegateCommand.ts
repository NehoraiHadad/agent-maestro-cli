/**
 * DelegateCommand - Delegate tasks to specialized agents (claude, codex, gemini)
 * Runs agents in one-shot mode for specific tasks
 */

import { Command } from 'commander';
import { AgentRepository } from '../../domain/index.js';
import { PTYManager } from '../../features/execution/pty/index.js';
import { ConsoleLogger } from '../../features/ui/index.js';
import type { AgentName } from '../../shared/types/index.js';

export class DelegateCommand {
  private static logger = new ConsoleLogger();
  private static ptyManager = new PTYManager();

  /**
   * Register the delegate command
   */
  static register(program: Command): void {
    program
      .command('delegate <agent> <task>')
      .description('Delegate a task to a specialized agent')
      .action(async (agentName: string, task: string) => {
        await this.execute(agentName, task);
      });
  }

  /**
   * Execute the delegate command
   */
  static async execute(agentName: string, task: string): Promise<void> {
    const repository = new AgentRepository();

    try {
      // Validate agent exists
      if (!repository.exists(agentName)) {
        this.logger.error(`\n❌ Unknown agent: ${agentName}`);
        this.logger.info('\nAvailable agents:');
        repository.findAll().forEach(agent => {
          this.logger.info(`  • ${agent.name} - ${agent.description}`);
        });
        process.exit(1);
      }

      const agent = repository.findByName(agentName as AgentName);

      // Check if agent is installed
      if (!(await this.ptyManager.isCommandAvailable(agent.command))) {
        this.logger.error(`\n❌ ${agent.displayName} is not installed`);
        if (agent.packageName) {
          this.logger.info(`\nInstall with: npm install -g ${agent.packageName}\n`);
        }
        process.exit(1);
      }

      // Show delegation header
      this.logger.separator();
      this.logger.info(`🎯 Delegating to ${agent.displayName}`);
      this.logger.info(`📝 Task: ${task}`);
      this.logger.separator();
      console.log(''); // Add spacing

      // Build execution arguments based on agent
      const args = this.buildArgs(agent.name as AgentName, task);

      // Execute agent with PTY for real-time output
      const processId = `delegate-${agent.name}-${Date.now()}`;
      this.ptyManager.spawn(
        processId,
        agent.command,
        args,
        {
          cwd: process.cwd(),
          env: process.env
        }
      );

      // Stream output in real-time
      let exitCode = 0;
      this.ptyManager.onData(processId, (data: string) => {
        process.stdout.write(data);
      });

      // Wait for completion
      await new Promise<void>((resolve) => {
        this.ptyManager.onExit(processId, (info) => {
          exitCode = info.exitCode;
          resolve();
        });
      });

      // Show completion status
      console.log(''); // Add spacing
      this.logger.separator();
      if (exitCode === 0) {
        this.logger.success(`✅ ${agent.displayName} completed successfully`);
      } else {
        this.logger.warn(`⚠️  ${agent.displayName} exited with code ${exitCode}`);
      }
      this.logger.separator();

      process.exit(exitCode);

    } catch (error) {
      this.logger.error(`\n❌ Delegation failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  /**
   * Build command arguments for one-shot execution
   */
  private static buildArgs(agentName: AgentName, task: string): string[] {
    switch (agentName) {
      case 'claude':
        // claude -p "task" (one-shot mode)
        return ['-p', task];

      case 'codex':
        // codex exec "task" (non-interactive) with full-access flag to skip approvals
        return ['--dangerously-bypass-approvals-and-sandbox', 'exec', task];

      case 'gemini':
        // gemini -p "task" (prompt mode)
        return ['-p', task];

      default:
        // Fallback: assume -p flag
        return ['-p', task];
    }
  }
}
