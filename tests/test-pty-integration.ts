#!/usr/bin/env node

/**
 * Test PTY integration with a real process
 */

import { PTYManager } from '../src/core/pty-manager.js';
import { Logger } from '../src/utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

Logger.header('🧪 PTY Integration Test');

async function testEchoCommand() {
  Logger.info('Test 1: Simple echo command');

  const ptyManager = new PTYManager();

  return new Promise((resolve) => {
    let output = '';

    ptyManager.spawn('test-echo', 'echo', ['Hello from PTY!']);

    ptyManager.onData('test-echo', (data) => {
      output += data;
      process.stdout.write(data);
    });

    ptyManager.onExit('test-echo', ({ exitCode }) => {
      if (exitCode === 0) {
        Logger.success('✓ Echo command test passed');
      } else {
        Logger.error(`✗ Echo command failed with code ${exitCode}`);
      }
      resolve();
    });
  });
}

async function testNodeScript() {
  Logger.info('\nTest 2: Node.js script execution');

  const ptyManager = new PTYManager();

  return new Promise((resolve) => {
    let output = '';

    ptyManager.spawn('test-node', 'node', ['-e', 'console.log("Hello from Node.js!")']);

    ptyManager.onData('test-node', (data) => {
      output += data;
      process.stdout.write(data);
    });

    ptyManager.onExit('test-node', ({ exitCode }) => {
      if (exitCode === 0 && output.includes('Hello from Node.js!')) {
        Logger.success('✓ Node.js script test passed');
      } else {
        Logger.error('✗ Node.js script test failed');
      }
      resolve();
    });
  });
}

async function testInteractiveProcess() {
  Logger.info('\nTest 3: Interactive process (cat)');

  const ptyManager = new PTYManager();

  return new Promise((resolve) => {
    let output = '';
    const testInput = 'Test message\n';

    ptyManager.spawn('test-cat', 'cat', []);

    ptyManager.onData('test-cat', (data) => {
      output += data;
      if (output.includes('Test message')) {
        Logger.success('✓ Interactive process test passed');
        ptyManager.kill('test-cat');
      }
    });

    ptyManager.onExit('test-cat', () => {
      resolve();
    });

    // Write input after a small delay
    setTimeout(() => {
      ptyManager.write('test-cat', testInput);
    }, 100);

    // Safety timeout
    setTimeout(() => {
      if (ptyManager.isRunning('test-cat')) {
        Logger.warn('⚠ Test timed out, killing process');
        ptyManager.kill('test-cat');
      }
    }, 2000);
  });
}

async function testMockAgent() {
  Logger.info('\nTest 4: Mock agent interaction');

  const ptyManager = new PTYManager();
  const mockAgentPath = path.join(__dirname, 'mock-agent.sh');

  return new Promise((resolve) => {
    let output = '';

    ptyManager.spawn('test-mock', mockAgentPath, []);

    ptyManager.onData('test-mock', (data) => {
      output += data;
      process.stdout.write(data);
    });

    ptyManager.onExit('test-mock', ({ exitCode }) => {
      if (exitCode === 0 && output.includes('Mock Agent')) {
        Logger.success('✓ Mock agent test passed');
      } else {
        Logger.error('✗ Mock agent test failed');
      }
      resolve();
    });

    // Send a test message
    setTimeout(() => {
      ptyManager.write('test-mock', 'hello\n');
    }, 500);
  });
}

async function runAllTests() {
  console.log('');

  try {
    await testEchoCommand();
    await testNodeScript();
    await testInteractiveProcess();
    await testMockAgent();

    console.log('');
    Logger.separator();
    Logger.success('All PTY integration tests completed! ✨');
    console.log('');
  } catch (error) {
    Logger.error(`Test error: ${error.message}`);
    process.exit(1);
  }
}

runAllTests();
