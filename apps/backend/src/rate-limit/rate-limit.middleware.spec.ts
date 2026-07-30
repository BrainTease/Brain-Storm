import { HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { UserRateLimitService, RateLimitStatus } from './user-rate-limit.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStatus(overrides: Partial<RateLimitStatus> = {}): RateLimitStatus {
  return {
    limit: 100,
    remaining: 99,
    resetTime: new Date(Date.now() + 60_000),
    dailyQuota: 0,
    dailyUsed: 0,
    dailyRemaining: -1,
    ...overrides,
  };
}

function makeReq(user?: Record<string, unknown>): any {
  return {
    user,
    method: 'GET',
    path: '/test',
    route: undefined,
  };
}

function makeRes(): any {
  const headers: Record<string, string> = {};
  return {
    set: jest.fn((key: string, value: string) => {
      headers[key] = value;
    }),
    _headers: headers,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;
  let rateLimitService: jest.Mocked<UserRateLimitService>;
  let next: jest.Mock;

  beforeEach(() => {
    rateLimitService = {
      checkRateLimit: jest.fn(),
      getRateLimitStatus: jest.fn(),
    } as unknown as jest.Mocked<UserRateLimitService>;

    middleware = new RateLimitMiddleware(rateLimitService);
    next = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  // ── unauthenticated requests ─────────────────────────────────────────────

  it('should call next() without checking rate limit for unauthenticated requests', async () => {
    await middleware.use(makeReq(undefined), makeRes(), next);
    expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should call next() for trusted users without checking', async () => {
    await middleware.use(makeReq({ id: 'u1', isTrusted: true }), makeRes(), next);
    expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  // ── allowed requests ────────────────────────────────────────────────────

  it('should call next() when request is within rate limit', async () => {
    const status = makeStatus({ remaining: 50 });
    rateLimitService.checkRateLimit.mockResolvedValue(true);
    rateLimitService.getRateLimitStatus.mockResolvedValue(status);

    const res = makeRes();
    await middleware.use(makeReq({ id: 'u2', role: 'student' }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res._headers['X-RateLimit-Limit']).toBe('100');
    expect(res._headers['X-RateLimit-Remaining']).toBe('50');
  });

  // ── blocked requests ─────────────────────────────────────────────────────

  it('should throw 429 when rate limit is exceeded', async () => {
    const status = makeStatus({ remaining: 0 });
    rateLimitService.checkRateLimit.mockResolvedValue(false);
    rateLimitService.getRateLimitStatus.mockResolvedValue(status);

    await expect(
      middleware.use(makeReq({ id: 'u3', role: 'student' }), makeRes(), next)
    ).rejects.toThrow(HttpException);

    try {
      await middleware.use(makeReq({ id: 'u3', role: 'student' }), makeRes(), next);
    } catch (e: any) {
      expect(e.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }

    expect(next).not.toHaveBeenCalled();
  });

  it('should set Retry-After header when rate limit is exceeded', async () => {
    const status = makeStatus({ remaining: 0 });
    rateLimitService.checkRateLimit.mockResolvedValue(false);
    rateLimitService.getRateLimitStatus.mockResolvedValue(status);

    const res = makeRes();
    try {
      await middleware.use(makeReq({ id: 'u4', role: 'student' }), res, next);
    } catch {
      /* expected */
    }

    expect(res._headers['Retry-After']).toBeDefined();
  });

  // ── quota headers ────────────────────────────────────────────────────────

  it('should set X-Quota-* headers when dailyQuota > 0', async () => {
    const status = makeStatus({ dailyQuota: 1000, dailyUsed: 100, dailyRemaining: 900 });
    rateLimitService.checkRateLimit.mockResolvedValue(true);
    rateLimitService.getRateLimitStatus.mockResolvedValue(status);

    const res = makeRes();
    await middleware.use(makeReq({ id: 'u5', role: 'guest' }), res, next);

    expect(res._headers['X-Quota-Limit']).toBe('1000');
    expect(res._headers['X-Quota-Remaining']).toBe('900');
  });

  it('should NOT set X-Quota-* headers when dailyQuota is 0 (unlimited)', async () => {
    const status = makeStatus({ dailyQuota: 0 });
    rateLimitService.checkRateLimit.mockResolvedValue(true);
    rateLimitService.getRateLimitStatus.mockResolvedValue(status);

    const res = makeRes();
    await middleware.use(makeReq({ id: 'u6', role: 'admin' }), res, next);

    expect(res._headers['X-Quota-Limit']).toBeUndefined();
    expect(res._headers['X-Quota-Remaining']).toBeUndefined();
  });

  // ── plan forwarding ──────────────────────────────────────────────────────

  it('should forward plan from user to the service', async () => {
    const status = makeStatus();
    rateLimitService.checkRateLimit.mockResolvedValue(true);
    rateLimitService.getRateLimitStatus.mockResolvedValue(status);

    await middleware.use(makeReq({ id: 'u7', role: 'student', plan: 'pro' }), makeRes(), next);

    expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
      'u7',
      'student',
      expect.any(String),
      'pro'
    );
  });

  // ── applyHeaders ─────────────────────────────────────────────────────────

  describe('applyHeaders', () => {
    it('should write all standard headers', () => {
      const status = makeStatus();
      const res = makeRes();
      middleware.applyHeaders(res, status, 99);

      expect(res._headers['X-RateLimit-Limit']).toBe('100');
      expect(res._headers['X-RateLimit-Remaining']).toBe('99');
      expect(res._headers['X-RateLimit-Reset']).toBeDefined();
    });
  });
});
