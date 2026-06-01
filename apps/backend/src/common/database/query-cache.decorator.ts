import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Decorator for caching query results
 * @param ttl - Time to live in seconds
 * @param keyPrefix - Cache key prefix
 */
export function CacheQuery(ttl: number = 300, keyPrefix: string = 'query') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheManager = this.cacheManager as Cache;
      if (!cacheManager) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key from method name and arguments
      const cacheKey = `${keyPrefix}:${propertyKey}:${JSON.stringify(args)}`;

      try {
        // Try to get from cache
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
          return cached;
        }
      } catch (error) {
        // If cache fails, continue with query
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      try {
        await cacheManager.set(cacheKey, result, ttl * 1000);
      } catch (error) {
        // If cache fails, still return result
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator for invalidating cache
 * @param patterns - Cache key patterns to invalidate
 */
export function InvalidateCache(...patterns: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheManager = this.cacheManager as Cache;

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Invalidate cache patterns
      if (cacheManager) {
        for (const pattern of patterns) {
          try {
            const store: any = (cacheManager as any).store;
            const client = store?.getClient?.();

            if (client && typeof client.keys === 'function') {
              const keys: string[] = await client.keys(pattern);
              if (keys.length) {
                await client.del(...keys);
              }
            }
          } catch (error) {
            // If cache invalidation fails, continue
          }
        }
      }

      return result;
    };

    return descriptor;
  };
}
