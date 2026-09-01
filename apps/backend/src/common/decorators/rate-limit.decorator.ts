import { UseInterceptors } from '@nestjs/common';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  message?: string;
  useAccountId?: boolean;
}

@Injectable()
class RateLimitInterceptor implements NestInterceptor {
  constructor(
    private config: RateLimitConfig,
    @Inject(CACHE_MANAGER) private cache: Cache
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const key = this.getKey(request);

    const current = await this.cache.get<number>(key);
    const count = (current ?? 0) + 1;

    if (count > this.config.limit) {
      return throwError(
        () =>
          new Error(this.config.message || 'Rate limit exceeded. Please try again later.')
      );
    }

    await this.cache.set(key, count, this.config.windowMs);

    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', this.config.limit);
    response.setHeader('X-RateLimit-Remaining', this.config.limit - count);
    response.setHeader(
      'X-RateLimit-Reset',
      new Date(Date.now() + this.config.windowMs).toISOString()
    );

    return next.handle();
  }

  private getKey(request: any): string {
    if (this.config.useAccountId && request.user?.id) {
      return `ratelimit:account:${request.user.id}`;
    }

    const ip = this.getClientIp(request);
    return `ratelimit:ip:${ip}`;
  }

  private getClientIp(request: any): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      return realIp;
    }

    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}

/**
 * @RateLimit decorator
 *
 * Applies rate limiting to a specific endpoint with configurable limits and window size.
 * Provides protection against abuse for sensitive endpoints like transaction submission.
 *
 * Usage:
 *   @Post('transaction')
 *   @RateLimit({ limit: 50, windowMs: 3600000, useAccountId: true })
 *   async submitTransaction(@Body() body: any) {
 *     // Protected endpoint
 *   }
 *
 * @param config Rate limit configuration
 */
export function RateLimit(config: RateLimitConfig) {
  return UseInterceptors(new RateLimitInterceptor(config, null as any));
}
