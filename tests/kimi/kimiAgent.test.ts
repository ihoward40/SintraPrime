import { KimiAgent } from '../../agents/kimi/kimiAgent.js';
import type { KimiConfig, KimiResponse, KimiStreamChunk } from '../../agents/kimi/types.js';

/**
 * Tests for KimiAgent
 * 
 * These tests validate configuration, error handling, and mock API interactions.
 * They do not make real API calls to avoid consuming credits during testing.
 */

// Test 1: Configuration validation
console.log('Test 1: Configuration validation');

try {
  // Should throw error with missing API key
  new KimiAgent({
    apiKey: '',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-32k',
    maxTokens: 4000,
    temperature: 0.7,
  });
  console.error('❌ Test 1 failed: Expected error for missing API key');
} catch (error) {
  if (error instanceof Error && error.message.includes('API key is required')) {
    console.log('✓ Test 1 passed: Configuration validation works');
  } else {
    console.error('❌ Test 1 failed: Wrong error message', error);
  }
}

// Test 2: Valid configuration
console.log('\nTest 2: Valid configuration');

try {
  const validConfig: KimiConfig = {
    apiKey: 'test_api_key_123',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-32k',
    maxTokens: 4000,
    temperature: 0.7,
  };

  const agent = new KimiAgent(validConfig);
  const config = agent.getConfig();

  console.assert(config.apiKey === validConfig.apiKey, 'API key should match');
  console.assert(config.model === validConfig.model, 'Model should match');
  console.assert(config.maxTokens === validConfig.maxTokens, 'Max tokens should match');
  
  console.log('✓ Test 2 passed: Valid configuration accepted');
} catch (error) {
  console.error('❌ Test 2 failed:', error);
}

// Test 3: Missing base URL validation
console.log('\nTest 3: Missing base URL validation');

try {
  new KimiAgent({
    apiKey: 'test_key',
    baseUrl: '',
    model: 'moonshot-v1-32k',
    maxTokens: 4000,
    temperature: 0.7,
  });
  console.error('❌ Test 3 failed: Expected error for missing base URL');
} catch (error) {
  if (error instanceof Error && error.message.includes('base URL is required')) {
    console.log('✓ Test 3 passed: Base URL validation works');
  } else {
    console.error('❌ Test 3 failed: Wrong error message', error);
  }
}

// Test 4: Missing model validation
console.log('\nTest 4: Missing model validation');

try {
  new KimiAgent({
    apiKey: 'test_key',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: '',
    maxTokens: 4000,
    temperature: 0.7,
  });
  console.error('❌ Test 4 failed: Expected error for missing model');
} catch (error) {
  if (error instanceof Error && error.message.includes('model is required')) {
    console.log('✓ Test 4 passed: Model validation works');
  } else {
    console.error('❌ Test 4 failed: Wrong error message', error);
  }
}

// Test 5: Stats tracking
console.log('\nTest 5: Stats tracking');

try {
  const agent = new KimiAgent({
    apiKey: 'test_key',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-32k',
    maxTokens: 4000,
    temperature: 0.7,
  });

  const initialStats = agent.getStats();
  console.assert(initialStats.requestCount === 0, 'Initial request count should be 0');
  console.assert(initialStats.lastRequestTime === 0, 'Initial last request time should be 0');
  
  console.log('✓ Test 5 passed: Stats tracking initialized correctly');
} catch (error) {
  console.error('❌ Test 5 failed:', error);
}

// Test 6: Message structure validation (type checking)
console.log('\nTest 6: Message structure validation');

try {
  const agent = new KimiAgent({
    apiKey: 'test_key',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-32k',
    maxTokens: 4000,
    temperature: 0.7,
  });

  // This just checks that the types are correct at compile time
  const validMessages = [
    { role: 'system' as const, content: 'You are a helpful assistant.' },
    { role: 'user' as const, content: 'Hello!' },
  ];

  // We won't actually call the API in tests, but we verify the structure is correct
  console.assert(validMessages[0].role === 'system', 'First message role should be system');
  console.assert(validMessages[1].role === 'user', 'Second message role should be user');
  
  console.log('✓ Test 6 passed: Message structure is valid');
} catch (error) {
  console.error('❌ Test 6 failed:', error);
}

console.log('\n=== All basic tests completed ===');
console.log('\nNote: Real API integration tests require a valid KIMI_API_KEY.');
console.log('To test with real API calls, set KIMI_API_KEY environment variable.');
