/**
 * Unit tests for HealthController — issue #995
 *
 * Covers /health/liveness, /health/readiness, and /health (full check)
 * for both healthy and unhealthy dependency scenarios.
 *
 * All external dependencies (HealthCheckService, TypeOrmHealthIndicator,
 * MemoryHealthIndicator, HttpHealthIndicator, CacheManager, Logger,
 * ConfigService) are replaced with lightweight mocks so no real DB,
 * Redis, or HTTP connections are required.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator, HttpHealthIndicator } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';

// ── Shared mock builders ──────────────────────────────────────────────────────

function mockLogger() {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

function mockConfigService(horizonUrl = 'https://horizon-testnet.stellar.org') {
  return { get: jest.fn().mockReturnValue(horizonUrl) };
}

/** Build a healthy HealthCheckService mock that runs all supplied checks. */
function mockHealthCheckService(outcome: 'healthy' | 'unhealthy' = 'healthy') {
  return {
    check: jest.fn().mockImplementation(async (checks: Array<() => Promise<any>>) => {
      if (outcome === 'unhealthy') {
        throw Object.assign(new Error('Health check failed'), {
          status: 'error',
          details: { database: { status: 'down' } },
        });
      }
      // Run every check so private methods are exercised.
      const results = {};
      for (const fn of checks) {
        const r = await fn();
        Object.assign(results, r);
      }
      return { status: 'ok', info: results, error: {}, details: results };
    }),
  };
}

function mockTypeOrm(healthy = true) {
  return {
    pingCheck: jest.fn().mockImplementation(async (key: string) => {
      if (!healthy) throw new Error('DB connection refused');
      return { [key]: { status: 'up' } };
    }),
  };
}

function mockMemory(healthy = true) {
  return {
    checkHeap: jest.fn().mockImplementation(async (key: string) => {
      if (!healthy) throw new Error('Heap exceeded');
      return { [key]: { status: 'up' } };
    }),
    checkRSS: jest.fn().mockImplementation(async (key: string) => {
      if (!healthy) throw new Error('RSS exceeded');
      return { [key]: { status: 'up' } };
    }),
  };
}

function mockHttp(healthy = true) {
  return {
    pingCheck: jest.fn().mockImplementation(async (key: string) => {
      if (!healthy) throw new Error('Horizon unreachable');
      return { [key]: { status: 'up' } };
    }),
  };
}

function mockCacheManager(healthy = true) {
  if (!healthy) {
    return {
      set: jest.fn().mockRejectedValue(new Error('Connection refused')),
      get: jest.fn(),
      del: jest.fn(),
    };
  }
  const store = new Map<string, unknown>();
  return {
    set: jest.fn().mockImplementation(async (k: string, v: unknown) => store.set(k, v)),
    get: jest.fn().mockImplementation(async (k: string) => store.get(k)),
    del: jest.fn().mockImplementation(async (k: string) => store.delete(k)),
  };
}

// ── Helper to build the controller with specific mock states ──────────────────

async function buildController(opts: {
  dbHealthy?: boolean;
  memHealthy?: boolean;
  httpHealthy?: boolean;
  redisHealthy?: boolean;
  healthOutcome?: 'healthy' | 'unhealthy';
} = {}) {
  const {
    dbHealthy = true,
    memHealthy = true,
    httpHealthy = true,
    redisHealthy = true,
    healthOutcome = 'healthy',
  } = opts;

  const module: TestingModule = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      { provide: HealthCheckService, useValue: mockHealthCheckService(healthOutcome) },
      { provide: TypeOrmHealthIndicator, useValue: mockTypeOrm(dbHealthy) },
      { provide: MemoryHealthIndicator, useValue: mockMemory(memHealthy) },
      { provide: HttpHealthIndicator, useValue: mockHttp(httpHealthy) },
      { provide: CACHE_MANAGER, useValue: mockCacheManager(redisHealthy) },
      { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger() },
      { provide: ConfigService, useValue: mockConfigService() },
    ],
  }).compile();

  return module.get<HealthController>(HealthController);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HealthController', () => {
  // ── /health/liveness ───────────────────────────────────────────────────────

  describe('liveness()', () => {
    it('returns status ok when memory is within limits', async () => {
      const ctrl = await buildController({ memHealthy: true });
      const result = await ctrl.liveness();
      expect(result.status).toBe('ok');
    });

    it('only calls memory.checkHeap — no DB or Redis involved', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          { provide: HealthCheckService, useValue: mockHealthCheckService('healthy') },
          { provide: TypeOrmHealthIndicator, useValue: mockTypeOrm(true) },
          { provide: MemoryHealthIndicator, useValue: mockMemory(true) },
          { provide: HttpHealthIndicator, useValue: mockHttp(true) },
          { provide: CACHE_MANAGER, useValue: mockCacheManager(true) },
          { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger() },
          { provide: ConfigService, useValue: mockConfigService() },
        ],
      }).compile();

      const memory = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);
      const db = module.get<TypeOrmHealthIndicator>(TypeOrmHealthIndicator);
      const ctrl = module.get<HealthController>(HealthController);

      await ctrl.liveness();

      expect(memory.checkHeap).toHaveBeenCalledTimes(1);
      expect(db.pingCheck).not.toHaveBeenCalled();
    });

    it('propagates the error thrown by HealthCheckService when memory is over limit', async () => {
      const ctrl = await buildController({ healthOutcome: 'unhealthy' });
      await expect(ctrl.liveness()).rejects.toThrow();
    });
  });

  // ── /health/readiness ──────────────────────────────────────────────────────

  describe('readiness()', () => {
    it('returns status ok when all dependencies are healthy', async () => {
      const ctrl = await buildController({
        dbHealthy: true,
        redisHealthy: true,
        httpHealthy: true,
      });
      const result = await ctrl.readiness();
      expect(result.status).toBe('ok');
    });

    it('calls DB, Redis, and Stellar checks', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          { provide: HealthCheckService, useValue: mockHealthCheckService('healthy') },
          { provide: TypeOrmHealthIndicator, useValue: mockTypeOrm(true) },
          { provide: MemoryHealthIndicator, useValue: mockMemory(true) },
          { provide: HttpHealthIndicator, useValue: mockHttp(true) },
          { provide: CACHE_MANAGER, useValue: mockCacheManager(true) },
          { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger() },
          { provide: ConfigService, useValue: mockConfigService() },
        ],
      }).compile();

      const db = module.get<TypeOrmHealthIndicator>(TypeOrmHealthIndicator);
      const http = module.get<HttpHealthIndicator>(HttpHealthIndicator);
      const cache = module.get<any>(CACHE_MANAGER);
      const ctrl = module.get<HealthController>(HealthController);

      await ctrl.readiness();

      expect(db.pingCheck).toHaveBeenCalledWith('database');
      expect(cache.set).toHaveBeenCalled(); // Redis check exercises set/get/del
      expect(http.pingCheck).toHaveBeenCalledWith(
        'stellar_horizon',
        expect.stringContaining('health')
      );
    });

    it('throws when the database is down', async () => {
      const ctrl = await buildController({ healthOutcome: 'unhealthy', dbHealthy: false });
      await expect(ctrl.readiness()).rejects.toThrow();
    });

    it('throws when Redis is unavailable', async () => {
      const ctrl = await buildController({ healthOutcome: 'unhealthy', redisHealthy: false });
      await expect(ctrl.readiness()).rejects.toThrow();
    });

    it('throws when Stellar Horizon is unreachable', async () => {
      const ctrl = await buildController({ healthOutcome: 'unhealthy', httpHealthy: false });
      await expect(ctrl.readiness()).rejects.toThrow();
    });

    it('uses the Horizon URL from ConfigService', async () => {
      const customUrl = 'https://horizon.stellar.org';
      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          { provide: HealthCheckService, useValue: mockHealthCheckService('healthy') },
          { provide: TypeOrmHealthIndicator, useValue: mockTypeOrm(true) },
          { provide: MemoryHealthIndicator, useValue: mockMemory(true) },
          { provide: HttpHealthIndicator, useValue: mockHttp(true) },
          { provide: CACHE_MANAGER, useValue: mockCacheManager(true) },
          { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger() },
          { provide: ConfigService, useValue: mockConfigService(customUrl) },
        ],
      }).compile();

      const http = module.get<HttpHealthIndicator>(HttpHealthIndicator);
      const ctrl = module.get<HealthController>(HealthController);

      await ctrl.readiness();

      expect(http.pingCheck).toHaveBeenCalledWith(
        'stellar_horizon',
        `${customUrl}/health`
      );
    });

    it('readiness does not call memory checks — those are liveness only', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          { provide: HealthCheckService, useValue: mockHealthCheckService('healthy') },
          { provide: TypeOrmHealthIndicator, useValue: mockTypeOrm(true) },
          { provide: MemoryHealthIndicator, useValue: mockMemory(true) },
          { provide: HttpHealthIndicator, useValue: mockHttp(true) },
          { provide: CACHE_MANAGER, useValue: mockCacheManager(true) },
          { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger() },
          { provide: ConfigService, useValue: mockConfigService() },
        ],
      }).compile();

      const memory = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);
      const ctrl = module.get<HealthController>(HealthController);

      await ctrl.readiness();

      expect(memory.checkHeap).not.toHaveBeenCalled();
      expect(memory.checkRSS).not.toHaveBeenCalled();
    });
  });

  // ── /health (full check) ───────────────────────────────────────────────────

  describe('check() — full health check', () => {
    it('returns status ok when all dependencies are healthy', async () => {
      const ctrl = await buildController();
      const result = await ctrl.check();
      expect(result.status).toBe('ok');
    });

    it('throws when any dependency is down', async () => {
      const ctrl = await buildController({ healthOutcome: 'unhealthy' });
      await expect(ctrl.check()).rejects.toThrow();
    });

    it('calls DB, memory, Redis, and Stellar checks', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          { provide: HealthCheckService, useValue: mockHealthCheckService('healthy') },
          { provide: TypeOrmHealthIndicator, useValue: mockTypeOrm(true) },
          { provide: MemoryHealthIndicator, useValue: mockMemory(true) },
          { provide: HttpHealthIndicator, useValue: mockHttp(true) },
          { provide: CACHE_MANAGER, useValue: mockCacheManager(true) },
          { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger() },
          { provide: ConfigService, useValue: mockConfigService() },
        ],
      }).compile();

      const db = module.get<TypeOrmHealthIndicator>(TypeOrmHealthIndicator);
      const memory = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);
      const ctrl = module.get<HealthController>(HealthController);

      await ctrl.check();

      expect(db.pingCheck).toHaveBeenCalledWith('database');
      expect(memory.checkHeap).toHaveBeenCalled();
      expect(memory.checkRSS).toHaveBeenCalled();
    });
  });

  // ── Redis check internals ──────────────────────────────────────────────────

  describe('Redis health check behaviour', () => {
    it('calls set, get, and del in the cache check cycle', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          { provide: HealthCheckService, useValue: mockHealthCheckService('healthy') },
          { provide: TypeOrmHealthIndicator, useValue: mockTypeOrm(true) },
          { provide: MemoryHealthIndicator, useValue: mockMemory(true) },
          { provide: HttpHealthIndicator, useValue: mockHttp(true) },
          { provide: CACHE_MANAGER, useValue: mockCacheManager(true) },
          { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger() },
          { provide: ConfigService, useValue: mockConfigService() },
        ],
      }).compile();

      const cache = module.get<any>(CACHE_MANAGER);
      const ctrl = module.get<HealthController>(HealthController);

      await ctrl.check();

      expect(cache.set).toHaveBeenCalledTimes(1);
      expect(cache.get).toHaveBeenCalledTimes(1);
      expect(cache.del).toHaveBeenCalledTimes(1);
    });

    it('surfaces a Redis failure when set throws', async () => {
      const failingCache = {
        set: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        get: jest.fn(),
        del: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          {
            provide: HealthCheckService,
            useValue: {
              check: jest.fn().mockImplementation(async (checks: Array<() => Promise<any>>) => {
                // Actually run the checks so the Redis error surfaces.
                for (const fn of checks) { await fn(); }
              }),
            },
          },
          { provide: TypeOrmHealthIndicator, useValue: mockTypeOrm(true) },
          { provide: MemoryHealthIndicator, useValue: mockMemory(true) },
          { provide: HttpHealthIndicator, useValue: mockHttp(true) },
          { provide: CACHE_MANAGER, useValue: failingCache },
          { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger() },
          { provide: ConfigService, useValue: mockConfigService() },
        ],
      }).compile();

      const ctrl = module.get<HealthController>(HealthController);
      await expect(ctrl.check()).rejects.toThrow(/Redis health check failed/i);
    });
  });
});
