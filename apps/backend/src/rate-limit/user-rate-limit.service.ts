import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// ─── Plan / tier definitions ──────────────────────────────────────────────────

export type UserPlan = 'free' | 'pro' | 'enterprise';
export type UserRole = 'admin' | 'instructor' | 'student' | 'guest';

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window length in ms */
  windowMs: number;
  /** Daily quota (optional; 0 = unlimited) */
  dailyQuota: number;
}

/** Per-role default limits (configurable without redeploy via env). */
export const ROLE_RATE_LIMITS: Record<string, RateLimitConfig> = {
  admin: { limit: Number(process.env.RATE_LIMIT_ADMIN) || 10000, windowMs: 60000 },
  instructor: { limit: Number(process.env.RATE_LIMIT_INSTRUCTOR) || 5000, windowMs: 60000 },
  student: { limit: Number(process.env.RATE_LIMIT_STUDENT) || 1000, windowMs: 60000 },
  guest: { limit: Number(process.env.RATE_LIMIT_GUEST) || 100, windowMs: 60000 },
};

/** Per-endpoint overrides (stricter limits for sensitive routes). */
export const ENDPOINT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'POST:/v1/auth/login': { limit: 10, windowMs: 60000 },
  'POST:/v1/auth/register': { limit: 5, windowMs: 60000 },
  'POST:/v1/auth/password-reset': { limit: 5, windowMs: 300000 },
  'GET:/v1/courses': { limit: 200, windowMs: 60000 },
};

/** Admin allowlist: these user IDs bypass all rate limiting. */
const ADMIN_ALLOWLIST = new Set<string>(
  (process.env.RATE_LIMIT_ALLOWLIST || '').split(',').filter(Boolean)
);

@Injectable()
export class UserRateLimitService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Sliding-window rate-limit check with daily quota tracking.
   * Returns true if the request is allowed.
   */
  async checkRateLimit(userId: string, role: string, endpoint?: string): Promise<boolean> {
    // Allowlist & admin bypass
    if (role === 'admin' || ADMIN_ALLOWLIST.has(userId)) return true;

    const config = this.resolveConfig(role, endpoint);
    const key = endpoint ? `rate-limit:${userId}:${endpoint}` : `rate-limit:${userId}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const timestamps = (await this.cacheManager.get<number[]>(key)) ?? [];
    const windowTimestamps = timestamps.filter((t) => t > windowStart);

    if (windowTimestamps.length >= config.limit) return false;

    // Check daily quota
    if (config.dailyQuota > 0) {
      const dailyCount = (await this.cacheManager.get<number>(dailyKey)) ?? 0;
      if (dailyCount >= config.dailyQuota) return false;
      await this.cacheManager.set(dailyKey, dailyCount + 1, this.secondsUntilMidnight() * 1000);
    }

    windowTimestamps.push(now);
    await this.cacheManager.set(windowKey, windowTimestamps, config.windowMs);
    return true;
  }

  async getRateLimitStatus(
    userId: string,
    role: string,
    endpoint?: string
  ): Promise<{ limit: number; remaining: number; resetTime: Date }> {
    const config = this.resolveConfig(role, endpoint);
    const key = endpoint ? `rate-limit:${userId}:${endpoint}` : `rate-limit:${userId}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const timestamps = (await this.cacheManager.get<number[]>(key)) ?? [];
    const windowTimestamps = timestamps.filter((t) => t > windowStart);

    const dailyRemaining = config.dailyQuota > 0
      ? Math.max(0, config.dailyQuota - dailyUsed)
      : -1; // -1 = unlimited

    const status: RateLimitStatus = {
      limit: config.limit,
      remaining: Math.max(0, config.limit - windowTimestamps.length),
      resetTime: new Date(now + config.windowMs),
      dailyQuota: config.dailyQuota,
      dailyUsed,
      dailyRemaining,
    };

    if (dailyRemaining === 0) {
      status.overagePrompt = 'You have exhausted your daily quota. Upgrade your plan for higher limits.';
    }

    return status;
  }

  async resetUserLimit(userId: string): Promise<void> {
    await this.cacheManager.del(`rate-limit:${userId}`);
    await this.cacheManager.del(`quota-daily:${userId}:${this.todayKey()}`);
  }

  addToAllowlist(userId: string): void {
    ADMIN_ALLOWLIST.add(userId);
  }

  removeFromAllowlist(userId: string): void {
    ADMIN_ALLOWLIST.delete(userId);
  }

  private resolveConfig(role: string, endpoint?: string): RateLimitConfig {
    if (endpoint && ENDPOINT_RATE_LIMITS[endpoint]) {
      return ENDPOINT_RATE_LIMITS[endpoint];
    }
    return ROLE_RATE_LIMITS[role] ?? ROLE_RATE_LIMITS['guest'];
  }
}
