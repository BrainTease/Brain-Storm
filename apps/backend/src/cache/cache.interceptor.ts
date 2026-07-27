import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { CACHE_TTL_KEY, CACHE_PREFIX_KEY } from './cache.decorators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private cacheService: CacheService,
    private invalidationService: CacheInvalidationService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const isGetRequest = request.method === 'GET';

    if (!isGetRequest) {
      // For non-GET requests, just proceed
      return next.handle();
    }

    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler());
    const prefix = this.reflector.get<string>(CACHE_PREFIX_KEY, context.getHandler());

    if (!ttl) {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(request, prefix);
    const ttlWithJitter = this.invalidationService.getTtlWithJitter(ttl);

    return this.cacheService.getOrSet(cacheKey, () => next.handle().toPromise(), Math.floor(ttlWithJitter));
  }

  private generateCacheKey(request: any, prefix?: string): string {
    const userId = request.user?.id || 'anonymous';
    const path = request.path;
    const query = JSON.stringify(request.query || {});
    return prefix ? `${prefix}${userId}:${path}:${query}` : `http:${userId}:${path}:${query}`;
  }
}
