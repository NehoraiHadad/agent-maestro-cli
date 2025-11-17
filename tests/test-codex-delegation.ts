#!/usr/bin/env node

/**
 * Test Codex delegation with exec subcommand
 */

import { DelegationHandler } from '../src/core/delegation-handler.js';
import { Logger } from '../src/utils/logger.js';

async function testCodexDelegation() {
  Logger.header('Testing Codex Delegation');

  const handler = new DelegationHandler({
    timeout: 30000,
    maxDepth: 3,
    showSpinner: true
  });

  try {
    Logger.info('Testing delegation to Codex...');
    Logger.info('Prompt: "What is 12 + 15? Answer with just the number."');
    Logger.separator();

    const result = await handler.execute(
      'codex',
      'What is 12 + 15? Answer with just the number.',
      { timeout: 30000 }
    );

    Logger.separator();
    Logger.success('Delegation completed!');
    console.log('\nResult received:');
    console.log(result);

    // Cleanup
    handler.cleanup();

    Logger.separator();
    Logger.success('Codex delegation test passed!');
    process.exit(0);

  } catch (error) {
    Logger.error(`Test failed: ${error.message}`);
    console.error(error);
    handler.cleanup();
    process.exit(1);
  }
}

testCodexDelegation();
