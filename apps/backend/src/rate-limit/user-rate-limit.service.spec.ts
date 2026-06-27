import { UserRateLimitService, ROLE_RATE_LIMITS, PLAN_RATE_LIMITS } from './user-rate-limit.service';

const makeCacheManager = () => {
  const store: Record<string, unknown> = {};
  return {
    get: jest.fn(async (key: string) => store[key] ?? undefined),
    set: jest.fn(async (key: string, value: unknown) => { store[key] = value; }),
    del: jest.fn(async (key: string) => { delete store[key]; }),
  };
};

describe('UserRateLimitService', () => {
  let service: UserRateLimitService;
  let cache: ReturnType<typeof makeCacheManager>;

  beforeEach(() => {
    cache = makeCacheManager();
    service = new UserRateLimitService(cache as any);
  });

  it('should allow admin regardless of limits', async () => {
    expect(await service.checkRateLimit('u1', 'admin')).toBe(true);
  });

  it('should allow requests within the window limit', async () => {
    for (let i = 0; i < 5; i++) {
      expect(await service.checkRateLimit('u2', 'guest')).toBe(true);
    }
  });

  it('should block when window limit is exceeded', async () => {
    const guestLimit = ROLE_RATE_LIMITS['guest'].limit;
    // Fill up the window
    for (let i = 0; i < guestLimit; i++) {
      await service.checkRateLimit('u3', 'guest');
    }
    expect(await service.checkRateLimit('u3', 'guest')).toBe(false);
  });

  it('should use plan limits over role limits when plan is provided', async () => {
    const proLimit = PLAN_RATE_LIMITS['pro'].limit;
    const config = service.resolveConfig('student', undefined, 'pro');
    expect(config.limit).toBe(proLimit);
  });

  it('should return quota status with correct fields', async () => {
    const status = await service.getRateLimitStatus('u4', 'student');
    expect(status).toHaveProperty('limit');
    expect(status).toHaveProperty('remaining');
    expect(status).toHaveProperty('resetTime');
    expect(status).toHaveProperty('dailyQuota');
    expect(status).toHaveProperty('dailyUsed');
    expect(status).toHaveProperty('dailyRemaining');
  });

  it('should reset counters for a user', async () => {
    await service.checkRateLimit('u5', 'student');
    await service.resetUserLimit('u5');
    expect(cache.del).toHaveBeenCalled();
  });

  it('should use endpoint override when present', () => {
    const config = service.resolveConfig('student', 'POST:/v1/auth/login');
    expect(config.limit).toBe(10);
  });

  it('should provide overage prompt when daily quota exhausted', async () => {
    // Mock dailyUsed >= dailyQuota
    cache.get.mockImplementation(async (key: string) => {
      if (key.startsWith('quota-daily:')) return ROLE_RATE_LIMITS['student'].dailyQuota;
      return [];
    });
    const status = await service.getRateLimitStatus('u6', 'student');
    expect(status.overagePrompt).toBeDefined();
  });
});
