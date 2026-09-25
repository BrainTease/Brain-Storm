import {
  CircuitBreaker,
  CircuitBreakerFactory,
  CircuitBreakerState,
  withRetryBackoff,
  stateToMetricValue,
} from './circuit-breaker';

describe('CircuitBreaker – Horizon outage simulation', () => {
  const config = {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 1000,
    resetTimeout: 50,
  };

  it('opens the circuit after repeated Horizon failures and serves the fallback', async () => {
    let calls = 0;
    const horizonCall = jest.fn(async () => {
      calls++;
      throw new Error('Horizon 503 Service Unavailable');
    });
    const fallback = jest.fn(async () => 'fallback-response');

    const breaker = new CircuitBreaker(horizonCall, fallback, config, 'horizon-outage', {
      maxRetries: 0,
    });

    for (let i = 0; i < config.failureThreshold; i++) {
      await expect(breaker.call()).rejects.toThrow();
    }

    expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

    const result = await breaker.call();
    expect(result).toBe('fallback-response');
    expect(fallback).toHaveBeenCalled();
  });

  it('transitions to HALF_OPEN then CLOSED once Horizon recovers', async () => {
    let shouldFail = true;
    const horizonCall = jest.fn(async () => {
      if (shouldFail) throw new Error('Horizon timeout');
      return 'ok';
    });
    const fallback = jest.fn(async () => 'fallback');

    const breaker = new CircuitBreaker(horizonCall, fallback, config, 'horizon-recovery', {
      maxRetries: 0,
    });

    for (let i = 0; i < config.failureThreshold; i++) {
      await expect(breaker.call()).rejects.toThrow();
    }
    expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

    await new Promise((resolve) => setTimeout(resolve, config.resetTimeout + 10));
    shouldFail = false;

    await breaker.call();
    await breaker.call();

    expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('publishes state transitions to the metrics sink', async () => {
    const setState = jest.fn();
    const incrementTrip = jest.fn();
    const incrementFallback = jest.fn();
    const horizonCall = jest.fn(async () => {
      throw new Error('network unreachable');
    });
    const fallback = jest.fn(async () => 'fallback');

    const breaker = new CircuitBreaker(
      horizonCall,
      fallback,
      config,
      'horizon-metrics',
      { maxRetries: 0 },
      { setState, incrementTrip, incrementFallback }
    );

    for (let i = 0; i < config.failureThreshold; i++) {
      await expect(breaker.call()).rejects.toThrow();
    }

    expect(incrementTrip).toHaveBeenCalledWith('horizon-metrics');
    expect(setState).toHaveBeenCalledWith('horizon-metrics', stateToMetricValue(CircuitBreakerState.OPEN));

    await breaker.call();
    expect(incrementFallback).toHaveBeenCalledWith('horizon-metrics');
  });

  it('retries transient Horizon failures with backoff before giving up', async () => {
    let attempts = 0;
    const flaky = async () => {
      attempts++;
      if (attempts < 3) throw new Error('ECONNRESET');
      return 'recovered';
    };

    const result = await withRetryBackoff(flaky, { maxRetries: 3, initialDelayMs: 1, maxDelayMs: 5 });
    expect(result).toBe('recovered');
    expect(attempts).toBe(3);
  });

  it('exposes a health snapshot for all registered breakers via the factory', async () => {
    const factory = new CircuitBreakerFactory();
    factory.setMetricsSink({
      setState: jest.fn(),
      incrementTrip: jest.fn(),
      incrementFallback: jest.fn(),
    });

    factory.create(
      'horizon-submit-tx',
      async () => {
        throw new Error('Horizon down');
      },
      async () => 'fallback',
      config,
      { maxRetries: 0 }
    );

    const breaker = factory.get('horizon-submit-tx')!;
    for (let i = 0; i < config.failureThreshold; i++) {
      await expect(breaker.call()).rejects.toThrow();
    }

    const snapshot = factory.getHealthSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].state).toBe(CircuitBreakerState.OPEN);
    expect(snapshot[0].name).toBe('horizon-submit-tx');
  });
});
