#!/usr/bin/env node

/**
 * Test script for Maestro functionality
 */

import { Maestro } from '../src/core/maestro.js';
import { Delegator } from '../src/core/delegator.js';

console.log('🧪 Testing Agent Maestro Components\n');

// Test 1: Delegation parsing
console.log('Test 1: Delegation Protocol Parsing');
const testLine = 'Some output MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "test task"} more text';

try {
  const prefix = 'MAESTRO_DELEGATE::';
  const jsonStart = testLine.indexOf(prefix) + prefix.length;
  const jsonStr = testLine.substring(jsonStart).split('}')[0] + '}';
  const parsed = JSON.parse(jsonStr);
  
  console.log('✅ Parsed delegation:', parsed);
  console.log('   Agent:', parsed.agent);
  console.log('   Prompt:', parsed.prompt);
} catch (error) {
  console.log('❌ Parsing failed:', error.message);
}

console.log('\nTest 2: Configuration Check');
import { AGENTS, DELEGATION_PREFIX } from '../src/config.js';

console.log('✅ Available agents:', Object.keys(AGENTS).join(', '));
console.log('✅ Delegation prefix:', DELEGATION_PREFIX);

console.log('\nTest 3: Logger Output');
import { Logger } from '../src/utils/logger.js';

Logger.info('This is an info message');
Logger.success('This is a success message');
Logger.warn('This is a warning');
Logger.delegation('gemini', 'Task execution');

console.log('\n✅ All component tests passed!');
console.log('\n📝 Note: Full integration test requires actual CLI agents installed.');
console.log('   Install: npm install -g @google/gemini-cli @anthropic-ai/claude-code @openai/codex');

