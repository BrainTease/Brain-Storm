import {
  UserRateLimitService,
  ROLE_RATE_LIMITS,
  PLAN_RATE_LIMITS,
  ENDPOINT_RATE_LIMITS,
} from './user-rate-limit.service';

// ─── In-memory cache helper ───────────────────────────────────────────────────

function makeCacheManager() {
  const store: Record<string, unknown> = {};
  return {
    get:  jest.fn(async (key: string) => store[key] ?? undefined),
    set:  jest.fn(async (key: string, value: unknown) => { store[key] = value; }),
    del:  jest.fn(async (key: string) => { delete store[key]; }),
    _store: store, // exposed for assertions
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserRateLimitService', () => {
  let service: UserRateLimitService;
  let cache: ReturnType<typeof makeCacheManager>;

  beforeEach(() => {
    cache = makeCacheManager();
    service = new UserRateLimitService(cache as any);
  });

  afterEach(() => jest.clearAllMocks());

  // ── checkRateLimit ──────────────────────────────────────────────────────────

  describe('checkRateLimit', () => {
    it('should always allow admin regardless of call count', async () => {
      for (let i = 0; i < 200; i++) {
        expect(await service.checkRateLimit('u1', 'admin')).toBe(true);
      }
    });

    it('should allow requests within the window limit', async () => {
      for (let i = 0; i < 5; i++) {
        expect(await service.checkRateLimit('u2', 'guest')).toBe(true);
      }
    });

    it('should block after the window limit is exceeded', async () => {
      const guestLimit = ROLE_RATE_LIMITS['guest'].limit;
      for (let i = 0; i < guestLimit; i++) {
        await service.checkRateLimit('u3', 'guest');
      }
      expect(await service.checkRateLimit('u3', 'guest')).toBe(false);
    });

    it('should use plan limits over role limits when plan is provided', async () => {
      const config = service.resolveConfig('student', undefined, 'pro');
      expect(config.limit).toBe(PLAN_RATE_LIMITS['pro'].limit);
    });

    it('should use endpoint override over plan and role', async () => {
      const config = service.resolveConfig('student', 'POST:/v1/auth/login', 'pro');
      expect(config.limit).toBe(ENDPOINT_RATE_LIMITS['POST:/v1/auth/login'].limit);
    });

    it('should fall back to guest limits for unknown roles', () => {
      const config = service.resolveConfig('unknown-role');
      expect(config).toEqual(ROLE_RATE_LIMITS['guest']);
    });

    it('should block when daily quota is exhausted', async () => {
      const quota = ROLE_RATE_LIMITS['guest'].dailyQuota;
      // Inject exhausted daily count directly into the cache store
      const dailyKey = Object.keys(cache._store).find((k) => k.startsWith('quota-daily:'))
        ?? `quota-daily:u4:${new Date().toISOString().slice(0, 10)}`;
      cache._store[dailyKey] = quota;

      // The check should see the quota as full and deny
      cache.get.mockImplementation(async (key: string) => {
        if (key.startsWith('quota-daily:')) return quota;
        return [];
      });

      expect(await service.checkRateLimit('u4', 'guest')).toBe(false);
    });

    it('should increment daily count when quota tracking is active', async () => {
      // guest role has dailyQuota > 0
      await service.checkRateLimit('u5', 'guest');
      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining('quota-daily:'),
        1,
        expect.any(Number),
      );
    });
  });

  // ── getRateLimitStatus ──────────────────────────────────────────────────────

  describe('getRateLimitStatus', () => {
    it('should return required status fields', async () => {
      const status = await service.getRateLimitStatus('u6', 'student');
      expect(status).toMatchObject({
        limit:         expect.any(Number),
        remaining:     expect.any(Number),
        resetTime:     expect.any(Date),
        dailyQuota:    expect.any(Number),
        dailyUsed:     expect.any(Number),
        dailyRemaining: expect.any(Number),
      });
    });

    it('should report remaining = limit when no requests have been made', async () => {
      const status = await service.getRateLimitStatus('fresh-user', 'student');
      expect(status.remaining).toBe(ROLE_RATE_LIMITS['student'].limit);
    });

    it('should set overagePrompt when dailyRemaining is 0', async () => {
      const quota = ROLE_RATE_LIMITS['guest'].dailyQuota;
      cache.get.mockImplementation(async (key: string) => {
        if (key.startsWith('quota-daily:')) return quota;
        return [];
      });

      const status = await service.getRateLimitStatus('u7', 'guest');
      expect(status.overagePrompt).toBeDefined();
      expect(status.dailyRemaining).toBe(0);
    });

    it('should return dailyRemaining = -1 for roles with unlimited quota', async () => {
      const status = await service.getRateLimitStatus('u8', 'admin');
      expect(status.dailyRemaining).toBe(-1);
    });
  });

  // ── resetUserLimit ──────────────────────────────────────────────────────────

  describe('resetUserLimit', () => {
    it('should delete the window key and daily key', async () => {
      await service.checkRateLimit('u9', 'student');
      await service.resetUserLimit('u9');

      expect(cache.del).toHaveBeenCalledWith('rate-limit:u9');
      expect(cache.del).toHaveBeenCalledWith(
        expect.stringContaining('quota-daily:u9:'),
      );
    });
  });

  // ── allowlist ───────────────────────────────────────────────────────────────

  describe('allowlist management', () => {
    it('should bypass rate limit for allowlisted user', async () => {
      service.addToAllowlist('vip-user');
      const guestLimit = ROLE_RATE_LIMITS['guest'].limit;
      // Fill cache beyond limit
      cache.get.mockImplementation(async () =>
        Array(guestLimit + 1).fill(Date.now()),
      );
      expect(await service.checkRateLimit('vip-user', 'guest')).toBe(true);
    });

    it('should block removed user after removal from allowlist', async () => {
      service.addToAllowlist('vip2');
      service.removeFromAllowlist('vip2');

      const guestLimit = ROLE_RATE_LIMITS['guest'].limit;
      cache.get.mockImplementation(async () =>
        Array(guestLimit + 1).fill(Date.now()),
      );
      expect(await service.checkRateLimit('vip2', 'guest')).toBe(false);
    });
  });

  // ── resolveConfig ───────────────────────────────────────────────────────────

  describe('resolveConfig', () => {
    it('endpoint override beats plan beats role', () => {
      const cfg = service.resolveConfig('student', 'POST:/v1/auth/login', 'enterprise');
      expect(cfg).toBe(ENDPOINT_RATE_LIMITS['POST:/v1/auth/login']);
    });

    it('plan beats role when no endpoint override', () => {
      const cfg = service.resolveConfig('student', undefined, 'pro');
      expect(cfg).toBe(PLAN_RATE_LIMITS['pro']);
    });

    it('role config used when no endpoint or plan', () => {
      const cfg = service.resolveConfig('instructor');
      expect(cfg).toBe(ROLE_RATE_LIMITS['instructor']);
    });
  });
});
