import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UserRole } from '../users/entities/user.entity';

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export const RATE_LIMIT_CONFIGS: Record<UserRole, RateLimitConfig> = {
  [UserRole.ADMIN]: { limit: 10000, windowMs: 60000 },
  [UserRole.INSTRUCTOR]: { limit: 5000, windowMs: 60000 },
  [UserRole.STUDENT]: { limit: 1000, windowMs: 60000 },
  [UserRole.GUEST]: { limit: 100, windowMs: 60000 },
};

@Injectable()
export class UserRateLimitService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async checkRateLimit(userId: string, role: UserRole): Promise<boolean> {
    const config = RATE_LIMIT_CONFIGS[role];
    const key = `rate-limit:${userId}`;

    const current = await this.cacheManager.get<number>(key);
    const count = (current || 0) + 1;

    if (count > config.limit) {
      return false;
    }

    await this.cacheManager.set(key, count, config.windowMs);
    return true;
  }

  async getRateLimitStatus(userId: string, role: UserRole) {
    const config = RATE_LIMIT_CONFIGS[role];
    const key = `rate-limit:${userId}`;
    const current = await this.cacheManager.get<number>(key);
    const count = current || 0;

    return {
      limit: config.limit,
      current: count,
      remaining: Math.max(0, config.limit - count),
      resetTime: new Date(Date.now() + config.windowMs),
    };
  }

  async resetUserLimit(userId: string): Promise<void> {
    const key = `rate-limit:${userId}`;
    await this.cacheManager.del(key);
  }

  async isTrustedClient(clientId: string): Promise<boolean> {
    const key = `trusted-client:${clientId}`;
    return !!(await this.cacheManager.get(key));
  }

  async addTrustedClient(clientId: string, ttlMs: number = 86400000): Promise<void> {
    const key = `trusted-client:${clientId}`;
    await this.cacheManager.set(key, true, ttlMs);
  }

  async removeTrustedClient(clientId: string): Promise<void> {
    const key = `trusted-client:${clientId}`;
    await this.cacheManager.del(key);
  }
}
