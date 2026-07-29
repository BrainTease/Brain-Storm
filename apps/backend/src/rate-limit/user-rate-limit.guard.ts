import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserRateLimitService, RateLimitStatus } from './user-rate-limit.service';

/**
 * UserRateLimitGuard
 *
 * NestJS guard variant of rate-limit enforcement — used at the controller /
 * handler level via @UseGuards().
 *
 * The actual allow/deny decision is fully delegated to UserRateLimitService.
 * Header-setting is kept in a private helper so the same logic is reused
 * without importing the middleware class.
 */
@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: UserRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request  = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (request.user?.isTrusted) return true;
    if (!request.user?.id) return true;

    const userId: string           = request.user.id;
    const role: string             = request.user.role ?? 'guest';
    const plan: string | undefined = request.user.plan;
    const endpoint = `${request.method}:${request.route?.path ?? request.path}`;

    const allowed = await this.rateLimitService.checkRateLimit(userId, role, endpoint, plan);
    const status  = await this.rateLimitService.getRateLimitStatus(userId, role, endpoint, plan);

    this.setHeaders(response, status, allowed ? status.remaining : 0);

    if (!allowed) {
      throw new HttpException(
        {
          statusCode:     HttpStatus.TOO_MANY_REQUESTS,
          message:        status.overagePrompt ?? 'Rate limit exceeded',
          retryAfter:     status.resetTime,
          dailyQuota:     status.dailyQuota,
          dailyRemaining: status.dailyRemaining,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private setHeaders(res: any, status: RateLimitStatus, remaining: number): void {
    res.set('X-RateLimit-Limit',     String(status.limit));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset',     status.resetTime.toISOString());

    if (status.dailyQuota > 0) {
      res.set('X-Quota-Limit',     String(status.dailyQuota));
      res.set('X-Quota-Remaining', String(status.dailyRemaining));
    }

    if (remaining === 0) {
      const retryAfterSecs = Math.ceil(
        (status.resetTime.getTime() - Date.now()) / 1000,
      );
      res.set('Retry-After', String(retryAfterSecs));
    }
  }
}
