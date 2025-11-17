#!/usr/bin/env node

/**
 * Test single message to Maestro
 */

import { Maestro } from '../src/core/maestro-message.js';
import { Logger } from '../src/utils/logger.js';

async function testSingleMessage() {
  Logger.header('Testing Single Message');

  console.log('');
  console.log('Creating Maestro with Gemini...');

  const maestro = new Maestro('gemini', {
    delegationTimeout: 30000,
    maxDelegationDepth: 3,
    showSpinner: true,
    verbose: false
  });

  await maestro.start();

  console.log('✓ Maestro started');
  console.log('');
  console.log('Sending message: "What is 10 + 15? Answer with just the number."');
  console.log('');

  try {
    const response = await maestro.sendMessage('What is 10 + 15? Answer with just the number.');

    console.log('');
    console.log('Response received:');
    console.log('─'.repeat(60));
    console.log(response.content);
    console.log('─'.repeat(60));
    console.log('');
    console.log('✅ Test completed successfully!');

    await maestro.stop();
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error(error);
    await maestro.stop();
    process.exit(1);
  }
}

testSingleMessage();
