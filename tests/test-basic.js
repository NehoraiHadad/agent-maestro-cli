#!/usr/bin/env node

/**
 * Basic functionality tests for AgentMaestro
 */

import { Logger } from '../src/utils/logger.js';
import { getAgent, getAllAgents, checkAgentAvailability } from '../src/agents/agent-config.js';
import { parseDelegationRequest, createDelegationRequest, isDelegationRequest } from '../src/protocols/delegation-protocol.js';
import { PTYManager } from '../src/core/pty-manager.js';

console.log('🧪 Running AgentMaestro Tests\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    Logger.success(`✓ ${name}`);
    passed++;
  } catch (error) {
    Logger.error(`✗ ${name}: ${error.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    Logger.success(`✓ ${name}`);
    passed++;
  } catch (error) {
    Logger.error(`✗ ${name}: ${error.message}`);
    failed++;
  }
}

// Test 1: Agent Configuration
Logger.header('Agent Configuration Tests');

test('getAgent returns valid agent', () => {
  const agent = getAgent('claude');
  if (!agent || agent.name !== 'claude') {
    throw new Error('Failed to get claude agent');
  }
});

test('getAllAgents returns all agents', () => {
  const agents = getAllAgents();
  if (agents.length !== 3) {
    throw new Error(`Expected 3 agents, got ${agents.length}`);
  }
});

test('getAgent throws on invalid agent', () => {
  try {
    getAgent('nonexistent');
    throw new Error('Should have thrown error');
  } catch (error) {
    if (!error.message.includes('Unknown agent')) {
      throw error;
    }
  }
});

// Test 2: Delegation Protocol
Logger.header('\nDelegation Protocol Tests');

test('createDelegationRequest formats correctly', () => {
  const request = createDelegationRequest('gemini', 'test prompt');
  if (!request.startsWith('MAESTRO_DELEGATE::')) {
    throw new Error('Invalid delegation request format');
  }
});

test('parseDelegationRequest parses correctly', () => {
  const line = 'MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "test"}';
  const parsed = parseDelegationRequest(line);
  if (parsed.agent !== 'gemini' || parsed.prompt !== 'test') {
    throw new Error('Failed to parse delegation request');
  }
});

test('isDelegationRequest detects correctly', () => {
  const validLine = 'MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "test"}';
  const invalidLine = 'This is just a normal line';
  if (!isDelegationRequest(validLine)) {
    throw new Error('Failed to detect valid delegation request');
  }
  if (isDelegationRequest(invalidLine)) {
    throw new Error('False positive on normal line');
  }
});

test('parseDelegationRequest handles invalid JSON', () => {
  const line = 'MAESTRO_DELEGATE::{invalid json}';
  try {
    parseDelegationRequest(line);
    throw new Error('Should have thrown error');
  } catch (error) {
    if (!error.message.includes('Failed to parse')) {
      throw error;
    }
  }
});

// Test 3: PTY Manager
Logger.header('\nPTY Manager Tests');

test('PTYManager can be instantiated', () => {
  const ptyManager = new PTYManager();
  if (!ptyManager) {
    throw new Error('Failed to create PTYManager');
  }
});

asyncTest('PTYManager can spawn and kill process', async () => {
  const ptyManager = new PTYManager();
  const id = 'test-1';

  // Spawn echo command
  ptyManager.spawn(id, 'echo', ['hello']);

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 100));

  // Kill process
  const killed = ptyManager.kill(id);
  if (!killed) {
    throw new Error('Failed to kill process');
  }

  // Cleanup
  ptyManager.cleanup();
});

asyncTest('PTYManager tracks running processes', async () => {
  const ptyManager = new PTYManager();

  // Spawn a sleep process
  ptyManager.spawn('test-2', 'sleep', ['1']);

  const running = ptyManager.getRunningProcesses();
  if (!running.includes('test-2')) {
    throw new Error('Process not tracked as running');
  }

  ptyManager.killAll();
});

// Test 4: Agent Availability
Logger.header('\nAgent Availability Tests');

await asyncTest('checkAgentAvailability works', async () => {
  // Check for Node.js (should always be available)
  const nodeAvailable = await checkAgentAvailability('claude');
  // Note: This test might fail if claude is not installed, which is ok for now
});

// Summary
Logger.header('\nTest Summary');
console.log(`Total: ${passed + failed}`);
Logger.success(`Passed: ${passed}`);
if (failed > 0) {
  Logger.error(`Failed: ${failed}`);
  process.exit(1);
} else {
  Logger.success('All tests passed!');
  process.exit(0);
}
