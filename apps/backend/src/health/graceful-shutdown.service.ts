import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

/**
 * GracefulShutdownService
 *
 * Tracks in-flight requests and delays shutdown until they complete (or the
 * drain timeout is reached). Wire it up by calling `trackRequest()` and
 * `releaseRequest()` from a middleware or interceptor.
 */
@Injectable()
export class GracefulShutdownService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GracefulShutdownService.name);

  /** ms to wait for in-flight requests before forcing shutdown */
  private readonly drainTimeoutMs: number;

  private inFlightCount = 0;
  private isShuttingDown = false;
  private drainResolve: (() => void) | null = null;

  constructor() {
    this.drainTimeoutMs = parseInt(process.env.SHUTDOWN_DRAIN_TIMEOUT_MS ?? '10000', 10);
  }

  onModuleInit() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  onModuleDestroy() {
    // Ensure cleanup even when NestJS tears down the module
    this.isShuttingDown = true;
  }

  trackRequest(): void {
    this.inFlightCount++;
  }

  releaseRequest(): void {
    if (this.inFlightCount > 0) this.inFlightCount--;
    if (this.isShuttingDown && this.inFlightCount === 0) {
      this.drainResolve?.();
    }
  }

  get shuttingDown(): boolean {
    return this.isShuttingDown;
  }

  private async shutdown(signal: string): Promise<void> {
    this.logger.log(`Received ${signal}. Starting graceful shutdown. In-flight: ${this.inFlightCount}`);
    this.isShuttingDown = true;

    if (this.inFlightCount > 0) {
      await Promise.race([
        new Promise<void>((resolve) => { this.drainResolve = resolve; }),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Drain timeout')), this.drainTimeoutMs),
        ),
      ]).catch((err) => {
        this.logger.warn(`Graceful shutdown: ${err.message}. Forcing exit with ${this.inFlightCount} in-flight requests.`);
      });
    }

    this.logger.log('Graceful shutdown complete.');
  }
}
