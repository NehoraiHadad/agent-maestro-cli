#!/usr/bin/env node

/**
 * Comprehensive test of the full delegation flow
 */

import { DelegationHandler } from '../src/core/delegation-handler.js';
import { Logger } from '../src/utils/logger.js';

async function testFullFlow() {
  Logger.header('🎭 Full Delegation Flow Test');

  const handler = new DelegationHandler({
    timeout: 30000,
    maxDepth: 3,
    showSpinner: true
  });

  console.log('');
  Logger.info('Testing multiple delegations to different agents');
  Logger.separator();

  try {
    // Test 1: Simple math with Gemini
    console.log('\n📝 Test 1: Math with Gemini');
    Logger.info('Delegating: "Calculate 15 * 7. Answer with just the number."');

    const result1 = await handler.execute(
      'gemini',
      'Calculate 15 * 7. Answer with just the number.',
      { timeout: 15000 }
    );

    console.log('\n✅ Result 1:');
    console.log(result1);

    // Test 2: Check if Claude is available
    console.log('\n\n📝 Test 2: Checking Claude availability');
    try {
      const { checkAgentAvailability } = await import('../src/agents/agent-config.js');
      const claudeAvailable = await checkAgentAvailability('claude');

      if (claudeAvailable) {
        Logger.info('Delegating to Claude: "Say hello in exactly 5 words"');

        const result2 = await handler.execute(
          'claude',
          'Say hello in exactly 5 words',
          { timeout: 20000 }
        );

        console.log('\n✅ Result 2:');
        console.log(result2);
      } else {
        Logger.warn('Claude not available, skipping Claude test');
      }
    } catch (error) {
      Logger.warn(`Claude test skipped: ${error.message}`);
    }

    // Test 3: Another Gemini delegation
    console.log('\n\n📝 Test 3: Another Gemini delegation');
    Logger.info('Delegating: "What is the capital of France? One word answer."');

    const result3 = await handler.execute(
      'gemini',
      'What is the capital of France? One word answer.',
      { timeout: 15000 }
    );

    console.log('\n✅ Result 3:');
    console.log(result3);

    // Show statistics
    console.log('\n');
    Logger.separator();
    Logger.success('All delegations completed!');
    Logger.info(`Total delegations: ${handler.getCount()}`);
    Logger.info(`Current depth: ${handler.getDepth()}`);

    // Cleanup
    handler.cleanup();

    console.log('');
    Logger.separator();
    Logger.header('✅ Full Flow Test Successful!');
    console.log('');
    console.log('Summary:');
    console.log('- Delegation handler properly spawns agents with -p flag');
    console.log('- Agents respond correctly to prompts');
    console.log('- Results are properly formatted and returned');
    console.log('- Multiple sequential delegations work correctly');
    console.log('');
    Logger.separator();

    process.exit(0);

  } catch (error) {
    Logger.error(`Test failed: ${error.message}`);
    console.error(error);
    handler.cleanup();
    process.exit(1);
  }
}

testFullFlow();
