import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  HttpHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private http: HttpHealthIndicator,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Liveness probe — only checks that the process is alive and not deadlocked.
   * Kubernetes restarts the pod if this fails.
   */
  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe', description: 'Returns 200 when the process is running.' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  @HealthCheck()
  liveness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
    ]);
  }

  /**
   * Readiness probe — checks all critical dependencies.
   * Kubernetes stops sending traffic if this fails.
   */
  @Get('readiness')
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Fails when any critical dependency (DB, Redis, Stellar) is unavailable.',
  })
  @ApiResponse({ status: 200, description: 'All critical dependencies are up' })
  @ApiResponse({ status: 503, description: 'One or more critical dependencies are down' })
  @HealthCheck()
  async readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkRedis(),
      () => this.checkStellarHorizon(),
    ]);
  }

  /**
   * Full health check (backward-compat) — liveness + readiness + memory.
   */
  @Get()
  @ApiOperation({ summary: 'Full health check' })
  @ApiResponse({ status: 200, description: 'All health checks passed' })
  @ApiResponse({ status: 503, description: 'One or more health checks failed' })
  @HealthCheck()
  async check() {
    this.logger.debug('Performing full health check', { context: 'HealthController' });

    const result = await this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      () => this.checkRedis(),
      () => this.checkStellarHorizon(),
    ]);

    this.logger.info('Health check completed', {
      context: 'HealthController',
      status: result.status,
      checks: Object.keys(result.details || {}).length,
    });

    return result;
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const key = `health-check:${Date.now()}`;
    const testValue = Date.now().toString();
    try {
      await this.cacheManager.set(key, testValue, 2000);
      const retrieved = await this.cacheManager.get(key);
      await this.cacheManager.del(key);
      if (retrieved !== testValue) throw new Error('Redis value mismatch');
      return { redis: { status: 'up' } };
    } catch (error) {
      this.logger.warn('Redis health check failed', { context: 'HealthController', error: error.message });
      throw new Error(`Redis health check failed: ${error.message}`);
    }
  }

  private async checkStellarHorizon(): Promise<HealthIndicatorResult> {
    const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    try {
      return await this.http.pingCheck('stellar_horizon', `${horizonUrl}/health`);
    } catch (error) {
      this.logger.warn('Stellar Horizon health check failed', { context: 'HealthController', error: error.message });
      throw error;
    }
  }
}
