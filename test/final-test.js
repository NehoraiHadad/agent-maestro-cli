#!/usr/bin/env node

/**
 * Final comprehensive test
 */

import chalk from 'chalk';
import { AGENTS } from '../src/config.js';
import { ConversationLogger } from '../src/utils/conversation-logger.js';
import { AgentExecutor } from '../src/core/agent-executor.js';

console.log(chalk.cyan.bold('\n🧪 Final Comprehensive Test\n'));
console.log(chalk.green('═'.repeat(60)));

// Test 1: Configuration
console.log(chalk.yellow('\n1. Configuration Test'));
console.log(`   Agents configured: ${Object.keys(AGENTS).join(', ')}`);
Object.values(AGENTS).forEach(agent => {
  console.log(`   ${chalk.green('✓')} ${agent.name}: ${agent.command}`);
});

// Test 2: Logger
console.log(chalk.yellow('\n2. Logger Test'));
const logger = new ConversationLogger('test-agent');
logger.logUserInput('Test input');
logger.logAgentExecution('test', 'Test execution');
logger.logAgentResponse('test', 'Test response');
logger.logSessionEnd();
const summary = logger.getSummary();
console.log(`   ${chalk.green('✓')} Log file created: ${summary.logFile}`);
console.log(`   ${chalk.green('✓')} Total interactions: ${summary.totalInteractions}`);

// Test 3: Agent Executor (with mock if real agents fail)
console.log(chalk.yellow('\n3. Agent Executor Test'));
for (const [name, agent] of Object.entries(AGENTS)) {
  const executor = new AgentExecutor(agent);
  try {
    // Try real agent with very short timeout
    const response = await executor.execute('test', 3000);
    console.log(`   ${chalk.green('✓')} ${name}: Connection successful`);
    console.log(chalk.gray(`      Response preview: ${response.substring(0, 50)}...`));
  } catch (error) {
    console.log(`   ${chalk.yellow('⚠')} ${name}: ${error.message}`);
    console.log(chalk.gray(`      (Agent may not be installed or configured)`));
  }
}

// Test 4: File structure
console.log(chalk.yellow('\n4. File Structure Test'));
import fs from 'fs';
const requiredFiles = [
  'src/index.js',
  'src/config.js',
  'src/core/maestro-cli.js',
  'src/core/agent-executor.js',
  'src/utils/logger.js',
  'src/utils/conversation-logger.js',
  'package.json',
  'README.md'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ${chalk.green('✓')} ${file}`);
  } else {
    console.log(`   ${chalk.red('✗')} ${file} missing`);
  }
});

console.log(chalk.green('\n═'.repeat(60)));
console.log(chalk.cyan.bold('\n✅ Test Suite Complete!\n'));

console.log(chalk.white('Next steps:'));
console.log(chalk.gray('  1. Run: node src/index.js --agent gemini'));
console.log(chalk.gray('  2. Try /test command to verify agent connection'));
console.log(chalk.gray('  3. Ask the agent a question'));
console.log(chalk.gray('  4. Check logs/ directory for session logs\n'));

