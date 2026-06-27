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

/** Per-role limits (role is the primary discriminator for authenticated users) */
export const ROLE_RATE_LIMITS: Record<UserRole, RateLimitConfig> = {
  admin:      { limit: 10000, windowMs: 60_000, dailyQuota: 0 },
  instructor: { limit: 5000,  windowMs: 60_000, dailyQuota: 100_000 },
  student:    { limit: 1000,  windowMs: 60_000, dailyQuota: 10_000 },
  guest:      { limit: 100,   windowMs: 60_000, dailyQuota: 500 },
};

/** Per-plan overrides — higher plan wins over role limit when more permissive */
export const PLAN_RATE_LIMITS: Record<UserPlan, RateLimitConfig> = {
  free:       { limit: 200,   windowMs: 60_000, dailyQuota: 1_000 },
  pro:        { limit: 2000,  windowMs: 60_000, dailyQuota: 50_000 },
  enterprise: { limit: 10000, windowMs: 60_000, dailyQuota: 0 },
};

/** Per-endpoint overrides (stricter limits for expensive ops) */
export const ENDPOINT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'POST:/v1/auth/register': { limit: 5,   windowMs: 60_000, dailyQuota: 20 },
  'POST:/v1/auth/login':    { limit: 10,  windowMs: 60_000, dailyQuota: 100 },
  'POST:/v1/stellar/send':  { limit: 20,  windowMs: 60_000, dailyQuota: 200 },
};

// Legacy export kept for backward-compat with existing imports
export const RATE_LIMIT_CONFIGS = ROLE_RATE_LIMITS;

// ─── Status DTO ───────────────────────────────────────────────────────────────

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetTime: Date;
  dailyQuota: number;
  dailyUsed: number;
  dailyRemaining: number;
  overagePrompt?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class UserRateLimitService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Sliding-window rate-limit check with daily quota tracking.
   * Returns true if the request is allowed.
   */
  async checkRateLimit(userId: string, role: string, endpoint?: string, plan?: string): Promise<boolean> {
    if (role === 'admin') return true;

    const config = this.resolveConfig(role, endpoint, plan);
    const windowKey = endpoint ? `rate-limit:${userId}:${endpoint}` : `rate-limit:${userId}`;
    const dailyKey = `quota-daily:${userId}:${this.todayKey()}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;

    const timestamps = (await this.cacheManager.get<number[]>(windowKey)) ?? [];
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

  async getRateLimitStatus(userId: string, role: string, endpoint?: string, plan?: string): Promise<RateLimitStatus> {
    const config = this.resolveConfig(role, endpoint, plan);
    const windowKey = endpoint ? `rate-limit:${userId}:${endpoint}` : `rate-limit:${userId}`;
    const dailyKey = `quota-daily:${userId}:${this.todayKey()}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const timestamps = (await this.cacheManager.get<number[]>(windowKey)) ?? [];
    const count = timestamps.filter((t) => t > windowStart).length;

    const dailyUsed = config.dailyQuota > 0
      ? (await this.cacheManager.get<number>(dailyKey)) ?? 0
      : 0;

    const dailyRemaining = config.dailyQuota > 0
      ? Math.max(0, config.dailyQuota - dailyUsed)
      : -1; // -1 = unlimited

    const status: RateLimitStatus = {
      limit: config.limit,
      remaining: Math.max(0, config.limit - count),
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

  /** Returns resolved config: endpoint override > plan override > role default */
  resolveConfig(role: string, endpoint?: string, plan?: string): RateLimitConfig {
    if (endpoint && ENDPOINT_RATE_LIMITS[endpoint]) return ENDPOINT_RATE_LIMITS[endpoint];
    if (plan && PLAN_RATE_LIMITS[plan as UserPlan]) return PLAN_RATE_LIMITS[plan as UserPlan];
    return ROLE_RATE_LIMITS[role as UserRole] ?? ROLE_RATE_LIMITS['guest'];
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private secondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
  }
}
