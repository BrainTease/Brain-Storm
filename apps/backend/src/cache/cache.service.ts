import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

export const CACHE_HIT_COUNTER = 'cache_hits_total';
export const CACHE_MISS_COUNTER = 'cache_misses_total';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectMetric(CACHE_HIT_COUNTER) private readonly hits: Counter<string>,
    @InjectMetric(CACHE_MISS_COUNTER) private readonly misses: Counter<string>
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.cache.get<T>(key);
    if (value !== null && value !== undefined) {
      this.hits.inc({ key: this.labelFor(key) });
      return value;
    }
    this.misses.inc({ key: this.labelFor(key) });
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    await this.cache.set(key, value, ttlSeconds);
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds = 60): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  /** Invalidate all keys matching a prefix pattern (requires ioredis client). */
  async invalidatePrefix(prefix: string): Promise<void> {
    try {
      const store: any = (this.cache as any).store;
      const client = store?.getClient?.() ?? store?.client;
      if (!client) {
        this.logger.warn('Cannot invalidate by prefix: Redis client not available');
        return;
      }
      const keys: string[] = await client.keys(`${prefix}*`);
      if (keys.length) {
        await client.del(keys);
        this.logger.debug(`Invalidated ${keys.length} keys with prefix "${prefix}"`);
      }
    } catch (err) {
      this.logger.error(`Failed to invalidate prefix "${prefix}": ${err}`);
    }
  }

  private labelFor(key: string): string {
    // Use the first two segments as metric label to avoid high-cardinality
    return key.split(':').slice(0, 2).join(':');
  }
}
