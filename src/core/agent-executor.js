import { spawn } from 'child_process';
import { Logger } from '../utils/logger.js';

/**
 * Executes agent commands in background and captures results
 */
export class AgentExecutor {
  constructor(agent) {
    this.agent = agent;
  }

  async execute(prompt, timeout = 30000, useJson = false) {
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      Logger.info(`Executing ${this.agent.name}...`);

      const flags = this.agent.flags || { prompt: '-p' };
      const args = [flags.prompt, prompt];
      
      if (useJson && flags.json) {
        args.push(flags.json);
      }

      const childProcess = spawn(this.agent.command, args, {
        cwd: process.cwd(),
        env: process.env
      });

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(errorOutput || `Agent exited with code ${code}`));
        }
      });

      const timer = setTimeout(() => {
        childProcess.kill();
        reject(new Error('Agent execution timeout'));
      }, timeout);

      childProcess.on('close', () => clearTimeout(timer));
    });
  }

  async executeWithJson(prompt, timeout = 30000) {
    const jsonPrompt = `${prompt}\n\nProvide response in JSON format if possible.`;
    return this.execute(jsonPrompt, timeout);
  }
}

