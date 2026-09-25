import { Logger } from '@nestjs/common';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 200,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Retries an async operation with exponential backoff.
 * Used to wrap Horizon/RPC calls before they reach the circuit breaker so
 * transient network blips don't immediately count as breaker failures.
 */
export async function withRetryBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  logger: Logger = new Logger('RetryBackoff')
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let attempt = 0;
  let delay = finalConfig.initialDelayMs;
  let lastError: unknown;

  while (attempt <= finalConfig.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;
      if (attempt > finalConfig.maxRetries) {
        break;
      }
      logger.warn(
        `Retry attempt ${attempt}/${finalConfig.maxRetries} after failure, waiting ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
    }
  }

  throw lastError;
}

export type CircuitBreakerMetricsSink = {
  setState: (breakerName: string, stateValue: number) => void;
  incrementTrip: (breakerName: string) => void;
  incrementFallback: (breakerName: string) => void;
};

export function stateToMetricValue(state: CircuitBreakerState): number {
  switch (state) {
    case CircuitBreakerState.CLOSED:
      return 0;
    case CircuitBreakerState.HALF_OPEN:
      return 1;
    case CircuitBreakerState.OPEN:
      return 2;
    default:
      return -1;
  }
}

/**
 * CircuitBreaker – Prevents cascading failures from upstream services
 *
 * Implements the standard circuit breaker pattern:
 * - CLOSED: Normal operation, calls pass through
 * - OPEN: Too many failures, calls are rejected immediately with fallback
 * - HALF_OPEN: Testing if service recovered, allows limited calls
 */
export class CircuitBreaker<T> {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private readonly logger = new Logger(CircuitBreaker.name);

  constructor(
    private readonly fn: () => Promise<T>,
    private readonly fallback: () => Promise<T> | T,
    private readonly config: CircuitBreakerConfig,
    private readonly name: string,
    private readonly retryConfig?: Partial<RetryConfig>,
    private readonly metricsSink?: CircuitBreakerMetricsSink
  ) {
    this.publishState();
  }

  async call(): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
        this.logger.log(`[${this.name}] Circuit breaker transitioning to HALF_OPEN`);
        this.publishState();
      } else {
        this.logger.warn(`[${this.name}] Circuit breaker is OPEN, using fallback`);
        this.metricsSink?.incrementFallback(this.name);
        return this.fallback();
      }
    }

    try {
      const result = await withRetryBackoff(this.fn, this.retryConfig, this.logger);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (this.state === CircuitBreakerState.OPEN) {
        this.metricsSink?.incrementFallback(this.name);
        return this.fallback();
      }
      throw error;
    }
  }

  private publishState(): void {
    this.metricsSink?.setState(this.name, stateToMetricValue(this.state));
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.logger.log(`[${this.name}] Circuit breaker reset to CLOSED`);
        this.publishState();
      }
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
      this.metricsSink?.incrementTrip(this.name);
      this.publishState();
      this.logger.error(
        `[${this.name}] Circuit breaker returned to OPEN after failure in HALF_OPEN state`
      );
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
      this.metricsSink?.incrementTrip(this.name);
      this.publishState();
      this.logger.error(
        `[${this.name}] Circuit breaker opened after ${this.failureCount} failures`
      );
    }
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime !== null && Date.now() >= this.nextAttemptTime;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.publishState();
  }

  getMetricsSnapshot(): {
    name: string;
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number | null;
  } {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * CircuitBreakerFactory – Creates and manages circuit breakers
 */
export class CircuitBreakerFactory {
  private breakers = new Map<string, CircuitBreaker<any>>();
  private readonly logger = new Logger(CircuitBreakerFactory.name);
  private metricsSink: CircuitBreakerMetricsSink | undefined;

  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    resetTimeout: 60000,
  };

  /** Called once at bootstrap so the metrics module can observe breaker state changes. */
  setMetricsSink(sink: CircuitBreakerMetricsSink): void {
    this.metricsSink = sink;
  }

  create<T>(
    name: string,
    fn: () => Promise<T>,
    fallback: () => Promise<T> | T,
    config?: Partial<CircuitBreakerConfig>,
    retryConfig?: Partial<RetryConfig>
  ): CircuitBreaker<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const breaker = new CircuitBreaker(fn, fallback, finalConfig, name, retryConfig, this.metricsSink);
    this.breakers.set(name, breaker);
    this.logger.log(`Circuit breaker created: ${name}`);
    return breaker;
  }

  get(name: string): CircuitBreaker<any> | undefined {
    return this.breakers.get(name);
  }

  getAll(): Map<string, CircuitBreaker<any>> {
    return this.breakers;
  }

  getHealthSnapshot(): Array<ReturnType<CircuitBreaker<any>['getMetricsSnapshot']>> {
    return Array.from(this.breakers.values()).map((breaker) => breaker.getMetricsSnapshot());
  }

  reset(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
      this.logger.log(`Circuit breaker reset: ${name}`);
    }
  }

  resetAll(): void {
    for (const [name, breaker] of this.breakers) {
      breaker.reset();
    }
    this.logger.log(`All circuit breakers reset`);
  }
}
