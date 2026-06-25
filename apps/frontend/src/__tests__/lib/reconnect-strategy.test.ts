import { describe, it, expect, beforeEach } from 'vitest';
import { ReconnectStrategy, DEFAULT_RECONNECT_CONFIG, ReconnectConfig } from '@/lib/reconnect-strategy';

describe('ReconnectStrategy', () => {
  let strategy: ReconnectStrategy;

  beforeEach(() => {
    strategy = new ReconnectStrategy();
  });

  describe('getDelay', () => {
    it('should return initial delay for first attempt', () => {
      const delay = strategy.getDelay(0);
      const expected = DEFAULT_RECONNECT_CONFIG.initialDelayMs;
      // Allow for jitter ±10%
      const jitterAmount = expected * DEFAULT_RECONNECT_CONFIG.jitterFactor;
      expect(delay).toBeGreaterThanOrEqual(expected - jitterAmount);
      expect(delay).toBeLessThanOrEqual(expected + jitterAmount);
    });

    it('should exponentially increase delay', () => {
      const delay1 = strategy.getDelay(0);
      const delay2 = strategy.getDelay(1);
      const delay3 = strategy.getDelay(2);

      // Account for jitter by checking rough boundaries
      expect(delay2).toBeGreaterThan(delay1 * 0.8); // Allow some jitter
      expect(delay3).toBeGreaterThan(delay2 * 0.8);
    });

    it('should cap delay at maxDelayMs', () => {
      // Get a very high attempt number
      const delay = strategy.getDelay(100);
      const maxDelay = DEFAULT_RECONNECT_CONFIG.maxDelayMs;
      const jitterAmount = maxDelay * DEFAULT_RECONNECT_CONFIG.jitterFactor;
      expect(delay).toBeLessThanOrEqual(maxDelay + jitterAmount);
    });

    it('should apply jitter correctly', () => {
      // Run multiple times to verify jitter variation
      const delays = Array.from({ length: 10 }, () => strategy.getDelay(0));
      const uniqueDelays = new Set(delays);
      // With jitter, we should get some variation
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    it('should not return negative delays', () => {
      for (let i = 0; i < 50; i++) {
        expect(strategy.getDelay(i)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('shouldRetry', () => {
    it('should return true when attempts < maxAttempts', () => {
      strategy = new ReconnectStrategy({
        ...DEFAULT_RECONNECT_CONFIG,
        maxAttempts: 5,
      });
      for (let i = 0; i < 5; i++) {
        expect(strategy.shouldRetry()).toBe(true);
        strategy.nextDelay();
      }
      expect(strategy.shouldRetry()).toBe(false);
    });

    it('should return true with Infinity maxAttempts', () => {
      for (let i = 0; i < 100; i++) {
        expect(strategy.shouldRetry()).toBe(true);
        strategy.nextDelay();
      }
    });
  });

  describe('nextDelay', () => {
    it('should increment attempt counter', () => {
      expect(strategy.getAttemptNumber()).toBe(0);
      strategy.nextDelay();
      expect(strategy.getAttemptNumber()).toBe(1);
      strategy.nextDelay();
      expect(strategy.getAttemptNumber()).toBe(2);
    });

    it('should return correct delay value', () => {
      const delay0 = strategy.getDelay(0);
      const nextDelay = strategy.nextDelay();
      const jitterAmount = delay0 * DEFAULT_RECONNECT_CONFIG.jitterFactor;

      expect(nextDelay).toBeGreaterThanOrEqual(delay0 - jitterAmount);
      expect(nextDelay).toBeLessThanOrEqual(delay0 + jitterAmount);
    });
  });

  describe('reset', () => {
    it('should reset attempt counter to 0', () => {
      strategy.nextDelay();
      strategy.nextDelay();
      strategy.nextDelay();
      expect(strategy.getAttemptNumber()).toBe(3);

      strategy.reset();
      expect(strategy.getAttemptNumber()).toBe(0);
    });

    it('should return to initial delay after reset', () => {
      strategy.nextDelay();
      strategy.nextDelay();

      strategy.reset();
      const delay = strategy.getDelay(0);
      const expected = DEFAULT_RECONNECT_CONFIG.initialDelayMs;
      const jitterAmount = expected * DEFAULT_RECONNECT_CONFIG.jitterFactor;

      expect(delay).toBeGreaterThanOrEqual(expected - jitterAmount);
      expect(delay).toBeLessThanOrEqual(expected + jitterAmount);
    });
  });

  describe('custom config', () => {
    it('should respect custom configuration', () => {
      const customConfig: ReconnectConfig = {
        initialDelayMs: 500,
        maxDelayMs: 5000,
        maxAttempts: 10,
        backoffMultiplier: 1.5,
        jitterFactor: 0.2,
      };

      strategy = new ReconnectStrategy(customConfig);
      const delay = strategy.getDelay(0);
      const jitterAmount = 500 * 0.2;

      expect(delay).toBeGreaterThanOrEqual(500 - jitterAmount);
      expect(delay).toBeLessThanOrEqual(500 + jitterAmount);
    });
  });

  describe('getAttemptNumber', () => {
    it('should return current attempt number', () => {
      expect(strategy.getAttemptNumber()).toBe(0);
      strategy.nextDelay();
      expect(strategy.getAttemptNumber()).toBe(1);
      strategy.nextDelay();
      expect(strategy.getAttemptNumber()).toBe(2);
    });
  });
});
