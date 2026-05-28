import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { UserRateLimitService } from './user-rate-limit.service';

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(private rateLimitService: UserRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Skip rate limiting for trusted clients
    if (request.user?.isTrusted) {
      return true;
    }

    // Skip if no user (public endpoints)
    if (!request.user?.id) {
      return true;
    }

    const userId = request.user.id;
    const role = request.user.role || 'guest';
    const endpoint = `${request.method}:${request.route?.path ?? request.path}`;

    const allowed = await this.rateLimitService.checkRateLimit(userId, role, endpoint);

    if (!allowed) {
      const status = await this.rateLimitService.getRateLimitStatus(userId, role, endpoint);
      response.set({
        'X-RateLimit-Limit': status.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': status.resetTime.toISOString(),
        'Retry-After': Math.ceil((status.resetTime.getTime() - Date.now()) / 1000).toString(),
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          retryAfter: status.resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const status = await this.rateLimitService.getRateLimitStatus(userId, role, endpoint);
    response.set({
      'X-RateLimit-Limit': status.limit.toString(),
      'X-RateLimit-Remaining': status.remaining.toString(),
      'X-RateLimit-Reset': status.resetTime.toISOString(),
    });

    return true;
  }
}
