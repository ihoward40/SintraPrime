import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from '../env-validator.js';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'test' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should use defaults for optional vars', () => {
    const env = validateEnv();
    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
  });

  test('should parse PORT as number', () => {
    process.env.PORT = '8080';
    const env = validateEnv();
    expect(env.PORT).toBe(8080);
  });

  test('should reject invalid Slack URL', () => {
    process.env.SLACK_WEBHOOK_URL = 'not-a-url';
    expect(() => validateEnv()).toThrow();
  });
});
