import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Logs all conversations for debugging and analysis
 */
export class ConversationLogger {
  constructor(primaryAgent) {
    this.primaryAgent = primaryAgent;
    this.sessionId = this.generateSessionId();
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, `session-${this.sessionId}.log`);
    this.conversationLog = [];
    
    this.initializeLogDirectory();
    this.logSessionStart();
  }

  generateSessionId() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  }

  initializeLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  logSessionStart() {
    const header = [
      '='.repeat(80),
      `MAESTRO SESSION LOG`,
      `Session ID: ${this.sessionId}`,
      `Primary Agent: ${this.primaryAgent}`,
      `Started: ${new Date().toISOString()}`,
      '='.repeat(80),
      ''
    ].join('\n');

    fs.writeFileSync(this.logFile, header);
    console.log(chalk.gray(`📝 Logging to: ${this.logFile}`));
  }

  logUserInput(input) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'USER_INPUT',
      content: input
    };
    
    this.conversationLog.push(entry);
    this.writeToFile(`[${entry.timestamp}] USER: ${input}\n`);
  }

  logAgentExecution(agentName, prompt) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'AGENT_EXECUTION',
      agent: agentName,
      prompt: prompt
    };
    
    this.conversationLog.push(entry);
    this.writeToFile(`[${entry.timestamp}] EXECUTING ${agentName.toUpperCase()}: ${prompt}\n`);
  }

  logAgentResponse(agentName, response) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'AGENT_RESPONSE',
      agent: agentName,
      content: response
    };
    
    this.conversationLog.push(entry);
    this.writeToFile(`[${entry.timestamp}] ${agentName.toUpperCase()} RESPONSE:\n${response}\n\n`);
  }

  logError(errorMessage, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'ERROR',
      message: errorMessage,
      context: context
    };
    
    this.conversationLog.push(entry);
    this.writeToFile(`[${entry.timestamp}] ERROR: ${errorMessage}\nContext: ${JSON.stringify(context, null, 2)}\n\n`);
  }

  logDelegation(fromAgent, toAgent, task) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'DELEGATION',
      from: fromAgent,
      to: toAgent,
      task: task
    };
    
    this.conversationLog.push(entry);
    this.writeToFile(`[${entry.timestamp}] DELEGATION: ${fromAgent} → ${toAgent}\nTask: ${task}\n`);
  }

  logCommand(command) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'COMMAND',
      content: command
    };
    
    this.conversationLog.push(entry);
    this.writeToFile(`[${entry.timestamp}] COMMAND: ${command}\n`);
  }

  writeToFile(content) {
    fs.appendFileSync(this.logFile, content);
  }

  logSessionEnd() {
    const footer = [
      '',
      '='.repeat(80),
      `Session ended: ${new Date().toISOString()}`,
      `Total interactions: ${this.conversationLog.length}`,
      '='.repeat(80)
    ].join('\n');

    this.writeToFile(footer);
  }

  getLogFilePath() {
    return this.logFile;
  }

  getSummary() {
    const userInputs = this.conversationLog.filter(e => e.type === 'USER_INPUT').length;
    const agentExecutions = this.conversationLog.filter(e => e.type === 'AGENT_EXECUTION').length;
    const errors = this.conversationLog.filter(e => e.type === 'ERROR').length;
    const delegations = this.conversationLog.filter(e => e.type === 'DELEGATION').length;

    return {
      sessionId: this.sessionId,
      totalInteractions: this.conversationLog.length,
      userInputs,
      agentExecutions,
      errors,
      delegations,
      logFile: this.logFile
    };
  }
}

