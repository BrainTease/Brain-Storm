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
    private readonly name: string
  ) {}

  async call(): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
        this.logger.log(`[${this.name}] Circuit breaker transitioning to HALF_OPEN`);
      } else {
        this.logger.warn(`[${this.name}] Circuit breaker is OPEN, using fallback`);
        return this.fallback();
      }
    }

    try {
      const result = await this.fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (this.state === CircuitBreakerState.OPEN) {
        return this.fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.logger.log(`[${this.name}] Circuit breaker reset to CLOSED`);
      }
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
      this.logger.error(
        `[${this.name}] Circuit breaker returned to OPEN after failure in HALF_OPEN state`
      );
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
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
  }
}

/**
 * CircuitBreakerFactory – Creates and manages circuit breakers
 */
export class CircuitBreakerFactory {
  private breakers = new Map<string, CircuitBreaker<any>>();
  private readonly logger = new Logger(CircuitBreakerFactory.name);

  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    resetTimeout: 60000,
  };

  create<T>(
    name: string,
    fn: () => Promise<T>,
    fallback: () => Promise<T> | T,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const breaker = new CircuitBreaker(fn, fallback, finalConfig, name);
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
