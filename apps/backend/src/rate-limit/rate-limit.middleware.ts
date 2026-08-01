import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserRateLimitService, RateLimitStatus } from './user-rate-limit.service';

/**
 * RateLimitMiddleware
 *
 * Extracted from UserRateLimitGuard so the same limiting logic can be
 * applied at the Express middleware layer (e.g. on specific route groups
 * declared in AppModule.configure()), while UserRateLimitGuard continues
 * to work at the NestJS guard layer for single-controller opt-in.
 *
 * Responsibilities extracted here:
 *  - Retrieve user identity from the request
 *  - Delegate the allow/deny decision to UserRateLimitService
 *  - Set the standardised X-RateLimit-* / X-Quota-* / Retry-After headers
 *  - Return 429 Too Many Requests if denied
 *
 * The service itself (UserRateLimitService) owns the sliding-window maths
 * and cache interactions — neither this class nor the guard duplicate that.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private readonly rateLimitService: UserRateLimitService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = (req as any).user;

    // Unauthenticated requests: let other middleware / guards decide
    if (!user?.id) {
      return next();
    }

    // Explicitly trusted callers bypass the middleware check
    if (user.isTrusted) {
      return next();
    }

    const userId: string = user.id;
    const role: string = user.role ?? 'guest';
    const plan: string | undefined = user.plan;
    const endpoint = `${req.method}:${(req as any).route?.path ?? req.path}`;

    const allowed = await this.rateLimitService.checkRateLimit(userId, role, endpoint, plan);

    const status = await this.rateLimitService.getRateLimitStatus(userId, role, endpoint, plan);

    this.applyHeaders(res, status, allowed ? status.remaining : 0);

    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: status.overagePrompt ?? 'Rate limit exceeded',
          retryAfter: status.resetTime,
          dailyQuota: status.dailyQuota,
          dailyRemaining: status.dailyRemaining,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return next();
  }

  /**
   * Write standardised rate-limit headers onto the response.
   * Extracted as a public method so it can be called from the guard as well,
   * keeping the header-setting logic in a single place.
   */
  applyHeaders(res: Response, status: RateLimitStatus, remaining: number): void {
    res.set('X-RateLimit-Limit', String(status.limit));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', status.resetTime.toISOString());

    if (status.dailyQuota > 0) {
      res.set('X-Quota-Limit', String(status.dailyQuota));
      res.set('X-Quota-Remaining', String(status.dailyRemaining));
    }

    if (remaining === 0) {
      const retryAfterSeconds = Math.ceil((status.resetTime.getTime() - Date.now()) / 1000);
      res.set('Retry-After', String(retryAfterSeconds));
    }
  }
}
