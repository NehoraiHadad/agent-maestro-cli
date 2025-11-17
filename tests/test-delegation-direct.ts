#!/usr/bin/env node

/**
 * Test the delegation handler directly
 */

import { DelegationHandler } from '../src/core/delegation-handler.js';
import { Logger } from '../src/utils/logger.js';

async function testDelegation() {
  Logger.header('Testing Delegation Handler');

  const handler = new DelegationHandler({
    timeout: 30000,
    maxDepth: 3,
    showSpinner: true
  });

  try {
    Logger.info('Testing delegation to Gemini...');
    Logger.info('Prompt: "What is 5 + 3? Answer with just the number."');
    Logger.separator();

    const result = await handler.execute(
      'gemini',
      'What is 5 + 3? Answer with just the number.',
      { timeout: 15000 }
    );

    Logger.separator();
    Logger.success('Delegation completed!');
    console.log('\nResult received:');
    console.log(result);

    // Cleanup
    handler.cleanup();

    Logger.separator();
    Logger.success('Test completed successfully!');
    process.exit(0);

  } catch (error) {
    Logger.error(`Test failed: ${error.message}`);
    console.error(error);
    handler.cleanup();
    process.exit(1);
  }
}

testDelegation();
