/**
 * Unit tests for src/config/validation.schema.ts
 *
 * Verifies that:
 * 1. Previously-missing variables (issue #805) are now validated.
 * 2. Required variables cause a startup-time validation failure when absent.
 * 3. Optional variables default correctly.
 */

import { validationSchema } from './validation.schema';

/**
 * Minimal set of required environment variables needed to pass schema validation.
 */
const REQUIRED_ENV: Record<string, string> = {
  DATABASE_HOST: 'localhost',
  DATABASE_USER: 'test_user',
  DATABASE_PASSWORD: 'test_pass',
  DATABASE_NAME: 'test_db',
  JWT_SECRET: 'a-secret-longer-than-sixteen-chars',
  REDIS_URL: 'redis://localhost:6379',
  STELLAR_SECRET_KEY: 'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  EMAIL_HOST: 'smtp.example.com',
  EMAIL_USER: 'user@example.com',
  EMAIL_PASS: 'email_pass',
};

describe('validationSchema (#805)', () => {
  const validate = (env: Record<string, unknown>) =>
    validationSchema.validate(env, { abortEarly: false, allowUnknown: true });

  // ── Required variables ────────────────────────────────────────────────────

  it('passes with all required variables present', () => {
    const { error } = validate(REQUIRED_ENV);
    expect(error).toBeUndefined();
  });

  it.each([
    'DATABASE_HOST',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'JWT_SECRET',
    'REDIS_URL',
    'STELLAR_SECRET_KEY',
    'EMAIL_HOST',
    'EMAIL_USER',
    'EMAIL_PASS',
  ])('fails when required variable %s is absent', (key) => {
    const env = { ...REQUIRED_ENV };
    delete env[key];
    const { error } = validate(env);
    expect(error).toBeDefined();
    const details = error!.details.map((d) => d.message).join(', ');
    expect(details).toContain(key);
  });

  // ── Previously-missing variables (issue #805 regression) ─────────────────

  it('accepts SENTRY_DSN as an optional URI', () => {
    const { error } = validate({ ...REQUIRED_ENV, SENTRY_DSN: 'https://abc@sentry.io/123' });
    expect(error).toBeUndefined();
  });

  it('accepts empty SENTRY_DSN (local dev without Sentry)', () => {
    const { error } = validate({ ...REQUIRED_ENV, SENTRY_DSN: '' });
    expect(error).toBeUndefined();
  });

  it('accepts GIT_COMMIT_SHA as optional string', () => {
    const { error } = validate({ ...REQUIRED_ENV, GIT_COMMIT_SHA: 'abc123def456' });
    expect(error).toBeUndefined();
  });

  it('accepts LOG_LEVEL with valid values', () => {
    for (const level of ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']) {
      const { error } = validate({ ...REQUIRED_ENV, LOG_LEVEL: level });
      expect(error).toBeUndefined();
    }
  });

  it('rejects invalid LOG_LEVEL', () => {
    const { error } = validate({ ...REQUIRED_ENV, LOG_LEVEL: 'trace' });
    expect(error).toBeDefined();
  });

  it('accepts STELLAR_HORIZON_URL as optional URI', () => {
    const { error } = validate({
      ...REQUIRED_ENV,
      STELLAR_HORIZON_URL: 'https://horizon.stellar.org',
    });
    expect(error).toBeUndefined();
  });

  it('accepts DB pool variables with integer values', () => {
    const { error } = validate({
      ...REQUIRED_ENV,
      DB_POOL_MAX: '30',
      DB_POOL_MIN: '2',
      DB_ACQUIRE_TIMEOUT: '15000',
      DB_IDLE_TIMEOUT: '5000',
    });
    expect(error).toBeUndefined();
  });

  it('accepts CORS variables', () => {
    const { error } = validate({
      ...REQUIRED_ENV,
      CORS_ORIGINS: 'https://app.example.com,https://admin.example.com',
      CORS_CREDENTIALS: 'true',
      CORS_MAX_AGE: '3600',
    });
    expect(error).toBeUndefined();
  });

  // ── Default values ────────────────────────────────────────────────────────

  it('applies correct defaults for optional variables', () => {
    const { value, error } = validate(REQUIRED_ENV);
    expect(error).toBeUndefined();
    expect(value.NODE_ENV).toBe('development');
    expect(value.PORT).toBe(3000);
    expect(value.LOG_LEVEL).toBe('info');
    expect(value.DB_POOL_MAX).toBe(20);
    expect(value.DB_POOL_MIN).toBe(5);
    expect(value.DB_ACQUIRE_TIMEOUT).toBe(30000);
    expect(value.DB_IDLE_TIMEOUT).toBe(10000);
    expect(value.CORS_CREDENTIALS).toBe(false);
    expect(value.CORS_MAX_AGE).toBe(86400);
    expect(value.STELLAR_HORIZON_URL).toBe('https://horizon-testnet.stellar.org');
    expect(value.THROTTLE_TTL).toBe(60000);
    expect(value.THROTTLE_LIMIT).toBe(100);
    expect(value.MODERATION_TOXICITY_THRESHOLD).toBe(0.7);
  });
});
