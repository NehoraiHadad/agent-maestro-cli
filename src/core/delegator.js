import * as pty from 'node-pty';
import { DELEGATION_PREFIX, MAESTRO_CONFIG } from '../config.js';
import { Logger } from '../utils/logger.js';

/**
 * Handles delegation to secondary agents
 */
export class Delegator {
  constructor(availableAgents) {
    this.availableAgents = availableAgents;
  }

  async execute(agentName, prompt, depth = 0) {
    if (depth >= MAESTRO_CONFIG.maxDelegationDepth) {
      Logger.error('Maximum delegation depth reached');
      return '[Error] Maximum delegation depth exceeded';
    }

    const agent = this.availableAgents[agentName];
    if (!agent) {
      Logger.error(`Unknown agent: ${agentName}`);
      return `[Error] Agent "${agentName}" not found`;
    }

    Logger.delegation(agentName, 'Executing task');

    return new Promise((resolve) => {
      let result = '';
      const secondaryProcess = pty.spawn(agent.command, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env
      });

      secondaryProcess.onData((data) => {
        result += data;
      });

      secondaryProcess.onExit(() => {
        Logger.delegation(agentName, 'Task completed');
        resolve(result);
      });

      secondaryProcess.write(`${prompt}\n`);
      
      setTimeout(() => {
        secondaryProcess.kill();
        resolve('[Timeout] Secondary agent did not respond in time');
      }, MAESTRO_CONFIG.delegationTimeout);
    });
  }
}

