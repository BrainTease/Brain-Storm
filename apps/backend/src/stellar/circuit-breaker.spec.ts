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
      expect(fn).toHaveBeenCalledOnce();
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should fail on first call error without opening', async () => {
      const error = new Error('Service error');
      const fn = jest.fn().mockRejectedValue(error);
      const fallback = jest.fn();
      const breaker = new CircuitBreaker(fn, fallback, {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 30000,
        resetTimeout: 60000,
      }, 'test');

      await expect(breaker.call()).rejects.toThrow('Service error');
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should open after reaching failureThreshold', async () => {
      const error = new Error('Service error');
      const fn = jest.fn().mockRejectedValue(error);
      const fallback = jest.fn().mockRejectedValue(new Error('Circuit open'));
      const breaker = new CircuitBreaker(fn, fallback, {
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 30000,
        resetTimeout: 60000,
      }, 'test');

      await expect(breaker.call()).rejects.toThrow('Service error');
      await expect(breaker.call()).rejects.toThrow('Service error');
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Next call should use fallback
      await expect(breaker.call()).rejects.toThrow('Circuit open');
      expect(fallback).toHaveBeenCalledTimes(1);
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

      // Open the breaker
      await expect(breaker.call()).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Next call uses fallback
      const result = await breaker.call();
      expect(result).toBe('fallback');
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('should transition to HALF_OPEN after resetTimeout', async () => {
      const fn = jest.fn();
      const fallback = jest.fn();
      const breaker = new CircuitBreaker(fn, fallback, {
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 30000,
        resetTimeout: 100,
      }, 'test');

      // Open the breaker
      fn.mockRejectedValueOnce(new Error('error'));
      await expect(breaker.call()).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Wait for resetTimeout
      await new Promise(r => setTimeout(r, 150));

      // Next call should transition to HALF_OPEN
      fn.mockResolvedValueOnce('success');
      const result = await breaker.call();
      expect(result).toBe('success');
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });
  });

  describe('HALF_OPEN state', () => {
    it('should close after successThreshold successes', async () => {
      const fn = jest.fn();
      const fallback = jest.fn();
      const breaker = new CircuitBreaker(fn, fallback, {
        failureThreshold: 1,
        successThreshold: 2,
        timeout: 30000,
        resetTimeout: 100,
      }, 'test');

      // Open the breaker
      fn.mockRejectedValueOnce(new Error('error'));
      await expect(breaker.call()).rejects.toThrow();

      // Wait for reset
      await new Promise(r => setTimeout(r, 150));

      // Succeed twice to close
      fn.mockResolvedValue('success');
      await breaker.call();
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

      await breaker.call();
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should reopen on failure in HALF_OPEN', async () => {
      const fn = jest.fn();
      const fallback = jest.fn().mockRejectedValue(new Error('fallback'));
      const breaker = new CircuitBreaker(fn, fallback, {
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 30000,
        resetTimeout: 100,
      }, 'test');

      // Open the breaker
      fn.mockRejectedValueOnce(new Error('error'));
      await expect(breaker.call()).rejects.toThrow();

      // Wait for reset
      await new Promise(r => setTimeout(r, 150));

      // Fail in HALF_OPEN
      fn.mockRejectedValueOnce(new Error('error'));
      await expect(breaker.call()).rejects.toThrow('error');
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('reset', () => {
    it('should reset state', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      const fallback = jest.fn();
      const breaker = new CircuitBreaker(fn, fallback, {
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 30000,
        resetTimeout: 60000,
      }, 'test');

      await expect(breaker.call()).rejects.toThrow();
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
    const fallback = jest.fn();

    const breaker = factory.create('test', fn, fallback, {
      failureThreshold: 1,
      successThreshold: 1,
      timeout: 30000,
      resetTimeout: 60000,
    });

    await expect(breaker.call()).rejects.toThrow();
    expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

    factory.reset('test');
    expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should reset all breakers', async () => {
    const factory = new CircuitBreakerFactory();
    const fn = jest.fn().mockRejectedValue(new Error('error'));
    const fallback = jest.fn();

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

    await expect(breaker1.call()).rejects.toThrow();
    await expect(breaker2.call()).rejects.toThrow();

    factory.resetAll();
    expect(breaker1.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(breaker2.getState()).toBe(CircuitBreakerState.CLOSED);
  });
});
