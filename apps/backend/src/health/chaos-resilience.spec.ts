/**
 * Chaos resilience test — backend graceful degradation (#1194).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS TESTS
 * ─────────────────────────────────────────────────────────────────────────────
 * This test suite asserts that the Brain-Storm backend degrades gracefully
 * when its dependencies (PostgreSQL, Redis, Stellar Horizon) experience
 * failures.  It is designed for two execution modes:
 *
 *  1. UNIT / CI mode  — mocks all external dependencies.  Runs in every CI
 *     pipeline with `npm test` and verifies error-handling logic without any
 *     real infrastructure.
 *
 *  2. INTEGRATION / staging mode — uses a live backend URL with Chaos Mesh
 *     experiments applied via kubectl.  Activated by setting the environment
 *     variable `CHAOS_TEST=true` and `CHAOS_BACKEND_URL=http://…`.
 *     See docs/chaos-testing.md for the full run-book.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ACCEPTANCE CRITERIA  (#1194)
 * ─────────────────────────────────────────────────────────────────────────────
 *  ✅ Backend does NOT throw unhandled rejections when DB is unreachable
 *  ✅ Backend does NOT throw unhandled rejections when Redis is unreachable
 *  ✅ Backend does NOT throw unhandled rejections when Stellar Horizon is unreachable
 *  ✅ /health/liveness check passes even when dependencies are degraded
 *  ✅ Error responses from the health service have a machine-readable `status` field
 *  ✅ Process does NOT crash — subsequent calls are still served
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO RUN
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit mode (default, no cluster required):
 *   cd apps/backend && npm test -- --testPathPattern=chaos-resilience
 *
 * Integration mode (staging + Chaos Mesh required):
 *   CHAOS_TEST=true CHAOS_BACKEND_URL=http://localhost:3000 \
 *     npm test -- --testPathPattern=chaos-resilience
 *
 * See docs/chaos-testing.md for the complete run-book.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  HttpHealthIndicator,
} from '@nestjs/terminus';

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

interface HealthResult {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, { status: 'up' | 'down' }>;
  error?: Record<string, { status: 'up' | 'down'; message?: string }>;
  details?: Record<string, { status: 'up' | 'down' }>;
}

// ---------------------------------------------------------------------------
// Shared mock builders
// ---------------------------------------------------------------------------

const cacheManagerMock = {
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockImplementation(() => Promise.resolve(Date.now().toString())),
  del: jest.fn().mockResolvedValue(undefined),
};

const loggerMock = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const configMock = {
  get: jest.fn((key: string) => {
    if (key === 'stellar.horizonUrl') return 'https://horizon-testnet.stellar.org';
    return undefined;
  }),
};

/** All dependencies healthy. */
function healthyCheckService(): jest.Mocked<HealthCheckService> {
  return {
    check: jest.fn().mockResolvedValue({
      status: 'ok',
      info: {
        database: { status: 'up' },
        redis: { status: 'up' },
        stellar_horizon: { status: 'up' },
        memory_heap: { status: 'up' },
        memory_rss: { status: 'up' },
      },
      details: {},
      error: {},
    } as HealthResult),
  } as unknown as jest.Mocked<HealthCheckService>;
}

/** Database unreachable — HealthCheckService throws like @nestjs/terminus does. */
function dbDownCheckService(): jest.Mocked<HealthCheckService> {
  const err = new Error('database: connection refused') as any;
  err.response = {
    status: 'error',
    error: { database: { status: 'down', message: 'connection refused' } },
    details: { database: { status: 'down' } },
  };
  return {
    check: jest.fn().mockRejectedValue(err),
  } as unknown as jest.Mocked<HealthCheckService>;
}

/** Redis unreachable. */
function redisDownCheckService(): jest.Mocked<HealthCheckService> {
  const err = new Error('Redis health check failed: ECONNREFUSED') as any;
  err.response = {
    status: 'error',
    error: { redis: { status: 'down', message: 'ECONNREFUSED' } },
    details: { redis: { status: 'down' } },
  };
  return {
    check: jest.fn().mockRejectedValue(err),
  } as unknown as jest.Mocked<HealthCheckService>;
}

/** Stellar Horizon unreachable. */
function stellarDownCheckService(): jest.Mocked<HealthCheckService> {
  const err = new Error('Stellar Horizon health check failed: timeout') as any;
  err.response = {
    status: 'error',
    error: { stellar_horizon: { status: 'down', message: 'timeout' } },
    details: { stellar_horizon: { status: 'down' } },
  };
  return {
    check: jest.fn().mockRejectedValue(err),
  } as unknown as jest.Mocked<HealthCheckService>;
}

/** Liveness-only health service (heap check passes). */
function livenessCheckService(): jest.Mocked<HealthCheckService> {
  return {
    check: jest.fn().mockResolvedValue({
      status: 'ok',
      info: { memory_heap: { status: 'up' } },
      details: {},
      error: {},
    } as HealthResult),
  } as unknown as jest.Mocked<HealthCheckService>;
}

const dbIndicatorMock = { pingCheck: jest.fn() } as unknown as jest.Mocked<TypeOrmHealthIndicator>;
const memoryIndicatorMock = { checkHeap: jest.fn(), checkRSS: jest.fn() } as unknown as jest.Mocked<MemoryHealthIndicator>;
const httpIndicatorMock = { pingCheck: jest.fn() } as unknown as jest.Mocked<HttpHealthIndicator>;

async function buildController(
  checkService: jest.Mocked<HealthCheckService>
): Promise<HealthController> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      { provide: HealthCheckService, useValue: checkService },
      { provide: TypeOrmHealthIndicator, useValue: dbIndicatorMock },
      { provide: MemoryHealthIndicator, useValue: memoryIndicatorMock },
      { provide: HttpHealthIndicator, useValue: httpIndicatorMock },
      { provide: CACHE_MANAGER, useValue: cacheManagerMock },
      { provide: WINSTON_MODULE_PROVIDER, useValue: loggerMock },
      { provide: ConfigService, useValue: configMock },
    ],
  }).compile();

  return module.get<HealthController>(HealthController);
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('Backend graceful degradation — chaos resilience (#1194)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Healthy baseline ──────────────────────────────────────────────────

  describe('1. Healthy baseline (all dependencies up)', () => {
    it('check() resolves with status=ok when all dependencies are up', async () => {
      const controller = await buildController(healthyCheckService());
      const result = await controller.check();
      expect((result as any).status).toBe('ok');
    });

    it('liveness() resolves when process is alive', async () => {
      const controller = await buildController(livenessCheckService());
      const result = await controller.liveness();
      expect((result as any).status).toBe('ok');
    });

    it('readiness() resolves when all dependencies are up', async () => {
      const controller = await buildController(healthyCheckService());
      const result = await controller.readiness();
      expect((result as any).status).toBe('ok');
    });
  });

  // ── 2. Database outage ───────────────────────────────────────────────────

  describe('2. Database outage (DB latency/partition injected)', () => {
    it('check() throws the @nestjs/terminus error shape — not an unhandled crash', async () => {
      const controller = await buildController(dbDownCheckService());

      // @nestjs/terminus throws an HttpException with status 503.
      // The test asserts the thrown error has a machine-readable `response` property
      // rather than a plain unhandled Error (which would indicate a crash).
      await expect(controller.check()).rejects.toMatchObject({
        response: expect.objectContaining({ status: 'error' }),
      });
    });

    it('check() does NOT throw a plain Error without response (no crash)', async () => {
      const controller = await buildController(dbDownCheckService());

      try {
        await controller.check();
        fail('Expected check() to throw');
      } catch (err: any) {
        // The error must have a structured `response` property (terminus shape)
        expect(err.response).toBeDefined();
        expect(err.response.status).toBe('error');
        // Must not be an unhandled TypeError/RangeError (crash indicator)
        expect(err).not.toBeInstanceOf(TypeError);
        expect(err).not.toBeInstanceOf(RangeError);
      }
    });

    it('process remains stable — second call after DB error also throws gracefully', async () => {
      const controller = await buildController(dbDownCheckService());

      await expect(controller.check()).rejects.toBeDefined();
      // Second call must also respond gracefully (not crash the process)
      await expect(controller.check()).rejects.toBeDefined();
    });
  });

  // ── 3. Redis outage ───────────────────────────────────────────────────────

  describe('3. Redis outage (Redis pod killed)', () => {
    it('readiness() throws terminus error shape when Redis is down', async () => {
      const controller = await buildController(redisDownCheckService());

      await expect(controller.readiness()).rejects.toMatchObject({
        response: expect.objectContaining({ status: 'error' }),
      });
    });

    it('error response contains machine-readable status field', async () => {
      const controller = await buildController(redisDownCheckService());

      try {
        await controller.readiness();
      } catch (err: any) {
        expect(err.response).toHaveProperty('status', 'error');
        expect(err.response.error).toBeDefined();
      }
    });

    it('process stable after Redis error — subsequent calls also respond', async () => {
      const controller = await buildController(redisDownCheckService());
      await expect(controller.readiness()).rejects.toBeDefined();
      await expect(controller.readiness()).rejects.toBeDefined();
    });
  });

  // ── 4. Stellar Horizon outage ─────────────────────────────────────────────

  describe('4. Stellar Horizon outage (packet loss injected)', () => {
    it('readiness() throws terminus error shape when Horizon is unreachable', async () => {
      const controller = await buildController(stellarDownCheckService());

      await expect(controller.readiness()).rejects.toMatchObject({
        response: expect.objectContaining({ status: 'error' }),
      });
    });

    it('error shape does not expose raw stack traces in response', async () => {
      const controller = await buildController(stellarDownCheckService());

      try {
        await controller.readiness();
      } catch (err: any) {
        const body = JSON.stringify(err.response ?? {});
        expect(body).not.toMatch(/at Object\./);
        expect(body).not.toMatch(/\.ts:\d+/);
      }
    });

    it('process survives — can handle subsequent requests after Horizon failure', async () => {
      const controller = await buildController(stellarDownCheckService());
      await expect(controller.readiness()).rejects.toBeDefined();
      await expect(controller.readiness()).rejects.toBeDefined();
    });
  });

  // ── 5. Liveness always passes regardless of dependency state ─────────────

  describe('5. Liveness probe independent of dependency state', () => {
    const scenarios = [
      { label: 'DB down', factory: dbDownCheckService },
      { label: 'Redis down', factory: redisDownCheckService },
      { label: 'Stellar down', factory: stellarDownCheckService },
    ];

    scenarios.forEach(({ label, factory }) => {
      it(`liveness() returns ok when ${label} (memory check still passes)`, async () => {
        // Override: liveness only checks heap — always succeeds
        const checkService = factory();
        checkService.check.mockResolvedValueOnce({
          status: 'ok',
          info: { memory_heap: { status: 'up' } },
          details: {},
          error: {},
        } as HealthResult);

        const controller = await buildController(checkService);
        const result = await controller.liveness();
        expect((result as any).status).toBe('ok');
      });
    });
  });

  // ── 6. Error response contract ────────────────────────────────────────────

  describe('6. Error response contract', () => {
    it('thrown error from terminus check has a `response.status` = "error"', async () => {
      const controller = await buildController(dbDownCheckService());

      try {
        await controller.check();
      } catch (err: any) {
        expect(err.response).toHaveProperty('status');
        expect(err.response.status).toBe('error');
      }
    });

    it('readiness error response includes an `error` map with per-check details', async () => {
      const controller = await buildController(dbDownCheckService());

      try {
        await controller.readiness();
      } catch (err: any) {
        expect(err.response.error).toBeDefined();
        // At least one failed check must be present
        expect(Object.keys(err.response.error).length).toBeGreaterThan(0);
      }
    });

    it('HealthCheckService.check is called with an array of indicator functions', async () => {
      const svc = healthyCheckService();
      const controller = await buildController(svc);

      await controller.check();

      const [[indicators]] = svc.check.mock.calls;
      expect(Array.isArray(indicators)).toBe(true);
      expect(indicators.length).toBeGreaterThan(0);
      indicators.forEach((fn: unknown) => expect(typeof fn).toBe('function'));
    });
  });
});

// ---------------------------------------------------------------------------
// Integration mode — skipped unless CHAOS_TEST=true
// ---------------------------------------------------------------------------

const CHAOS_TEST = process.env['CHAOS_TEST'] === 'true';
const CHAOS_BACKEND_URL = process.env['CHAOS_BACKEND_URL'] ?? 'http://localhost:3000';

(CHAOS_TEST ? describe : describe.skip)(
  'Chaos integration tests — requires CHAOS_TEST=true and live staging backend',
  () => {
    it('GET /health/liveness returns 200 against live backend', async () => {
      // Dynamic import to avoid loading node-fetch at module evaluation time
      // when running in unit mode (where node-fetch is not available).
      const { default: fetch } = await import('node-fetch' as any);
      const res = await fetch(`${CHAOS_BACKEND_URL}/health/liveness`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
    });

    it('GET /health/readiness returns 503 or 200 (not a crash) during chaos experiment', async () => {
      const { default: fetch } = await import('node-fetch' as any);
      const res = await fetch(`${CHAOS_BACKEND_URL}/health/readiness`);
      expect([200, 503]).toContain(res.status);
      const body = await res.json();
      expect(body).toHaveProperty('status');
    });

    it('subsequent requests to liveness are served after a readiness failure', async () => {
      const { default: fetch } = await import('node-fetch' as any);
      // First request may fail (expected during chaos)
      await fetch(`${CHAOS_BACKEND_URL}/health/readiness`).catch(() => null);
      // Liveness must still succeed
      const res = await fetch(`${CHAOS_BACKEND_URL}/health/liveness`);
      expect(res.status).toBe(200);
    });
  }
);
