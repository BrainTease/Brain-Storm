/**
 * CircuitBreaker unit tests – Issue #1021
 *
 * All timing-dependent state transitions use Jest fake timers so the suite
 * never depends on real wall-clock time. No `await new Promise(r => setTimeout(r, …))` calls.
 */
import { CircuitBreaker, CircuitBreakerFactory, CircuitBreakerState } from './circuit-breaker';

describe('CircuitBreaker', () => {
  describe('CLOSED state', () => {
    it('should pass successful calls through', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const fallback = jest.fn();
      const breaker = new CircuitBreaker(fn, fallback, {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 30000,
        resetTimeout: 60000,
      }, 'test');

      const result = await breaker.call();
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should fail on first call error without opening', async () => {
      const error = new Error('Service error');
      const fn = jest.fn().mockRejectedValue(error);
      // Fallback returns undefined – breaker is still CLOSED after 1 failure
      const fallback = jest.fn().mockResolvedValue(undefined);
      const breaker = new CircuitBreaker(fn, fallback, {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 30000,
        resetTimeout: 60000,
      }, 'test');

      // With failureThreshold=3 the breaker stays CLOSED after one failure and rethrows
      await expect(breaker.call()).rejects.toThrow('Service error');
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should open after reaching failureThreshold', async () => {
      const error = new Error('Service error');
      const fn = jest.fn().mockRejectedValue(error);
      // Fallback returns a value so calls after opening succeed via fallback
      const fallback = jest.fn().mockResolvedValue('circuit-open-fallback');
      const breaker = new CircuitBreaker(fn, fallback, {
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 30000,
        resetTimeout: 60000,
      }, 'test');

      // First failure – CLOSED, re-throws
      await expect(breaker.call()).rejects.toThrow('Service error');
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);

      // Second failure – opens the breaker, then immediately returns fallback
      const result = await breaker.call();
      expect(result).toBe('circuit-open-fallback');
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Subsequent calls use fallback
      const result2 = await breaker.call();
      expect(result2).toBe('circuit-open-fallback');
      expect(fallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('OPEN state', () => {
    it('should use fallback when open', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Service error'));
      const fallback = jest.fn().mockResolvedValue('fallback');
      const breaker = new CircuitBreaker(fn, fallback, {
        failureThreshold: 1,
        successThreshold: 2,
        timeout: 30000,
        resetTimeout: 60000,
      }, 'test');

      // After first failure the breaker opens and immediately returns fallback
      const result = await breaker.call();
      expect(result).toBe('fallback');
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Subsequent calls also use fallback
      const result2 = await breaker.call();
      expect(result2).toBe('fallback');
      expect(fallback).toHaveBeenCalledTimes(2);
    });

    it('should transition to HALF_OPEN after resetTimeout', async () => {
      jest.useFakeTimers();
      try {
        const fn = jest.fn();
        const fallback = jest.fn().mockResolvedValue('fallback');
        // Use successThreshold=2 so that one success leaves it in HALF_OPEN
        const breaker = new CircuitBreaker(fn, fallback, {
          failureThreshold: 1,
          successThreshold: 2,
          timeout: 30000,
          resetTimeout: 100,
        }, 'test');

        // Open the breaker – fn rejects, then fallback returns 'fallback'
        fn.mockRejectedValueOnce(new Error('error'));
        const result = await breaker.call();
        expect(result).toBe('fallback');
        expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

        // Advance past resetTimeout
        jest.advanceTimersByTime(150);

        // Next call transitions to HALF_OPEN and succeeds (1 of 2 successes needed)
        fn.mockResolvedValueOnce('success');
        const result2 = await breaker.call();
        expect(result2).toBe('success');
        // With successThreshold=2, still HALF_OPEN after first success
        expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('HALF_OPEN state', () => {
    it('should close after successThreshold successes', async () => {
      jest.useFakeTimers();
      try {
        const fn = jest.fn();
        const fallback = jest.fn().mockResolvedValue('fallback');
        const breaker = new CircuitBreaker(fn, fallback, {
          failureThreshold: 1,
          successThreshold: 2,
          timeout: 30000,
          resetTimeout: 100,
        }, 'test');

        // Open the breaker
        fn.mockRejectedValueOnce(new Error('error'));
        await breaker.call(); // opens, returns fallback

        // Advance past reset
        jest.advanceTimersByTime(150);

        // Succeed twice to close
        fn.mockResolvedValue('success');
        await breaker.call();
        expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

        await breaker.call();
        expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should reopen on failure in HALF_OPEN', async () => {
      jest.useFakeTimers();
      try {
        const fn = jest.fn();
        const fallback = jest.fn().mockResolvedValue('fallback');
        const breaker = new CircuitBreaker(fn, fallback, {
          failureThreshold: 1,
          successThreshold: 1,
          timeout: 30000,
          resetTimeout: 100,
        }, 'test');

        // Open the breaker
        fn.mockRejectedValueOnce(new Error('open-error'));
        await breaker.call(); // opens, returns fallback
        expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

        // Advance past reset
        jest.advanceTimersByTime(150);

        // Fail in HALF_OPEN – breaker re-opens and returns fallback
        fn.mockRejectedValueOnce(new Error('half-open-error'));
        const result = await breaker.call();
        expect(result).toBe('fallback');
        expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('reset', () => {
    it('should reset state', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      const fallback = jest.fn().mockResolvedValue('fallback');
      const breaker = new CircuitBreaker(fn, fallback, {
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 30000,
        resetTimeout: 60000,
      }, 'test');

      await breaker.call(); // opens, returns fallback
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      breaker.reset();
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });
});

describe('CircuitBreakerFactory', () => {
  it('should create and manage breakers', () => {
    const factory = new CircuitBreakerFactory();
    const fn = jest.fn();
    const fallback = jest.fn();

    const breaker = factory.create('test', fn, fallback);
    expect(breaker).toBeDefined();
    expect(factory.get('test')).toBe(breaker);
  });

  it('should reset individual breakers', async () => {
    const factory = new CircuitBreakerFactory();
    const fn = jest.fn().mockRejectedValue(new Error('error'));
    const fallback = jest.fn().mockResolvedValue('fallback');

    const breaker = factory.create('test', fn, fallback, {
      failureThreshold: 1,
      successThreshold: 1,
      timeout: 30000,
      resetTimeout: 60000,
    });

    await breaker.call(); // opens, returns fallback
    expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

    factory.reset('test');
    expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should reset all breakers', async () => {
    const factory = new CircuitBreakerFactory();
    const fn = jest.fn().mockRejectedValue(new Error('error'));
    const fallback = jest.fn().mockResolvedValue('fallback');

    const breaker1 = factory.create('test1', fn, fallback, {
      failureThreshold: 1,
      successThreshold: 1,
      timeout: 30000,
      resetTimeout: 60000,
    });

    const breaker2 = factory.create('test2', fn, fallback, {
      failureThreshold: 1,
      successThreshold: 1,
      timeout: 30000,
      resetTimeout: 60000,
    });

    await breaker1.call(); // opens
    await breaker2.call(); // opens

    factory.resetAll();
    expect(breaker1.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(breaker2.getState()).toBe(CircuitBreakerState.CLOSED);
  });
});
