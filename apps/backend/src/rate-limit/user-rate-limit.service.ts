import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetTime: Date;
  dailyQuota: number;
  dailyUsed: number;
  dailyRemaining: number;
  /** Present only when daily quota is exhausted */
  overagePrompt?: string;
}

// ─── Configuration tables ─────────────────────────────────────────────────────

/** Per-role default limits (configurable without redeploy via env). */
export const ROLE_RATE_LIMITS: Record<string, RateLimitConfig> = {
  admin: { limit: Number(process.env.RATE_LIMIT_ADMIN) || 10_000, windowMs: 60_000, dailyQuota: 0 },
  instructor: {
    limit: Number(process.env.RATE_LIMIT_INSTRUCTOR) || 5_000,
    windowMs: 60_000,
    dailyQuota: 0,
  },
  student: {
    limit: Number(process.env.RATE_LIMIT_STUDENT) || 1_000,
    windowMs: 60_000,
    dailyQuota: 0,
  },
  guest: { limit: Number(process.env.RATE_LIMIT_GUEST) || 100, windowMs: 60_000, dailyQuota: 200 },
};

/** Per-plan limits — take precedence over role limits when set. */
export const PLAN_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: { limit: 200, windowMs: 60_000, dailyQuota: 1_000 },
  pro: { limit: 2_000, windowMs: 60_000, dailyQuota: 10_000 },
  enterprise: { limit: 10_000, windowMs: 60_000, dailyQuota: 0 },
};

/** Per-endpoint overrides (stricter limits for sensitive routes). */
export const ENDPOINT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'POST:/v1/auth/login': { limit: 10, windowMs: 60_000, dailyQuota: 0 },
  'POST:/v1/auth/register': { limit: 5, windowMs: 60_000, dailyQuota: 0 },
  'POST:/v1/auth/password-reset': { limit: 5, windowMs: 300_000, dailyQuota: 0 },
  'GET:/v1/courses': { limit: 200, windowMs: 60_000, dailyQuota: 0 },
};

/** Admin allowlist: these user IDs bypass all rate limiting. */
const ADMIN_ALLOWLIST = new Set<string>(
  (process.env.RATE_LIMIT_ALLOWLIST || '').split(',').filter(Boolean)
);

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class UserRateLimitService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Sliding-window rate-limit check with optional daily quota tracking.
   * Returns `true` if the request should be allowed.
   */
  async checkRateLimit(
    userId: string,
    role: string,
    endpoint?: string,
    plan?: string
  ): Promise<boolean> {
    if (role === 'admin' || ADMIN_ALLOWLIST.has(userId)) return true;

    const config = this.resolveConfig(role, endpoint, plan);
    const windowKey = this.windowKey(userId, endpoint);
    const dailyKey = this.dailyKey(userId);

    const now = Date.now();
    const timestamps = (await this.cacheManager.get<number[]>(windowKey)) ?? [];
    const windowTimestamps = timestamps.filter((t) => t > now - config.windowMs);

    if (windowTimestamps.length >= config.limit) return false;

    // Daily quota check
    if (config.dailyQuota > 0) {
      const dailyCount = (await this.cacheManager.get<number>(dailyKey)) ?? 0;
      if (dailyCount >= config.dailyQuota) return false;
      await this.cacheManager.set(dailyKey, dailyCount + 1, this.msUntilMidnight());
    }

    windowTimestamps.push(now);
    await this.cacheManager.set(windowKey, windowTimestamps, config.windowMs);
    return true;
  }

  async getRateLimitStatus(
    userId: string,
    role: string,
    endpoint?: string,
    plan?: string
  ): Promise<RateLimitStatus> {
    const config = this.resolveConfig(role, endpoint, plan);
    const windowKey = this.windowKey(userId, endpoint);
    const dailyKey = this.dailyKey(userId);

    const now = Date.now();
    const timestamps = (await this.cacheManager.get<number[]>(windowKey)) ?? [];
    const windowTimestamps = timestamps.filter((t) => t > now - config.windowMs);

    const dailyUsed =
      config.dailyQuota > 0 ? ((await this.cacheManager.get<number>(dailyKey)) ?? 0) : 0;

    const dailyRemaining = config.dailyQuota > 0 ? Math.max(0, config.dailyQuota - dailyUsed) : -1; // -1 = unlimited

    const status: RateLimitStatus = {
      limit: config.limit,
      remaining: Math.max(0, config.limit - windowTimestamps.length),
      resetTime: new Date(now + config.windowMs),
      dailyQuota: config.dailyQuota,
      dailyUsed,
      dailyRemaining,
    };

    if (dailyRemaining === 0) {
      status.overagePrompt =
        'You have exhausted your daily quota. Upgrade your plan for higher limits.';
    }

    return status;
  }

  async resetUserLimit(userId: string): Promise<void> {
    // Clear all window keys (base + endpoint-specific) and the daily quota key.
    await this.cacheManager.del(this.windowKey(userId));
    await this.cacheManager.del(this.dailyKey(userId));
  }

  addToAllowlist(userId: string): void {
    ADMIN_ALLOWLIST.add(userId);
  }

  removeFromAllowlist(userId: string): void {
    ADMIN_ALLOWLIST.delete(userId);
  }

  /**
   * Exposed so the middleware and tests can call it directly.
   * Resolution order: endpoint override → plan → role → guest fallback.
   */
  resolveConfig(role: string, endpoint?: string, plan?: string): RateLimitConfig {
    if (endpoint && ENDPOINT_RATE_LIMITS[endpoint]) {
      return ENDPOINT_RATE_LIMITS[endpoint];
    }
    if (plan && PLAN_RATE_LIMITS[plan]) {
      return PLAN_RATE_LIMITS[plan];
    }
    return ROLE_RATE_LIMITS[role] ?? ROLE_RATE_LIMITS['guest'];
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private windowKey(userId: string, endpoint?: string): string {
    return endpoint ? `rate-limit:${userId}:${endpoint}` : `rate-limit:${userId}`;
  }

  private dailyKey(userId: string): string {
    return `quota-daily:${userId}:${this.todayKey()}`;
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private msUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }
}
