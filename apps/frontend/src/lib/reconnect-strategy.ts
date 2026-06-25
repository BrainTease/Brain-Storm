/**
 * Exponential backoff strategy for WebSocket reconnection
 */

export interface ReconnectConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

export const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  maxAttempts: Infinity,
  backoffMultiplier: 2,
  jitterFactor: 0.1, // ±10% jitter
};

export class ReconnectStrategy {
  private attempts = 0;

  constructor(private config: ReconnectConfig = DEFAULT_RECONNECT_CONFIG) {}

  /**
   * Calculate delay for the given attempt number
   */
  getDelay(attemptNumber: number): number {
    const exponentialDelay = Math.min(
      this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attemptNumber),
      this.config.maxDelayMs,
    );

    // Add jitter: ±jitterFactor%
    const jitter = exponentialDelay * this.config.jitterFactor;
    const random = (Math.random() - 0.5) * 2 * jitter;

    return Math.max(0, Math.round(exponentialDelay + random));
  }

  /**
   * Should attempt reconnection?
   */
  shouldRetry(): boolean {
    return this.attempts < this.config.maxAttempts;
  }

  /**
   * Get next delay and increment attempt counter
   */
  nextDelay(): number {
    const delay = this.getDelay(this.attempts);
    this.attempts++;
    return delay;
  }

  /**
   * Reset attempt counter on successful connection
   */
  reset(): void {
    this.attempts = 0;
  }

  /**
   * Get current attempt number
   */
  getAttemptNumber(): number {
    return this.attempts;
  }
}
