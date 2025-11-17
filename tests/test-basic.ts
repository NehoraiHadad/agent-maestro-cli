import { Maestro } from '../src/features/orchestration/Maestro.js';

async function testBasic(): Promise<void> {
  console.log('✓ Testing basic Maestro compilation...');

  // Test that we can create a Maestro instance
  const maestro = Maestro.create({
    verbose: true,
    showSpinner: false
  });

  // Verify maestro instance is created
  if (!maestro) {
    throw new Error('Failed to create Maestro instance');
  }

  console.log('✓ Maestro instance created successfully');
  console.log('✓ TypeScript compilation test passed');

  // Note: Actual execution test skipped as it requires Claude CLI to be installed
  // For full integration tests, run manually with Claude CLI available
}

testBasic().catch(console.error);
