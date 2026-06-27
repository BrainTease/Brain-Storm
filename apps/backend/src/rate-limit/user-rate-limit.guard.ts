import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { UserRateLimitService } from './user-rate-limit.service';

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(private rateLimitService: UserRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (request.user?.isTrusted) return true;
    if (!request.user?.id) return true;

    const userId = request.user.id;
    const role: string = request.user.role || 'guest';
    const plan: string | undefined = request.user.plan;
    const endpoint = `${request.method}:${request.route?.path ?? request.path}`;

    const allowed = await this.rateLimitService.checkRateLimit(userId, role, endpoint, plan);

    if (!allowed) {
      const status = await this.rateLimitService.getRateLimitStatus(userId, role, endpoint, plan);
      this.setHeaders(response, status, 0);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: status.overagePrompt ?? 'Rate limit exceeded',
          retryAfter: status.resetTime,
          dailyQuota: status.dailyQuota,
          dailyRemaining: status.dailyRemaining,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const status = await this.rateLimitService.getRateLimitStatus(userId, role, endpoint, plan);
    this.setHeaders(response, status, status.remaining);

    return true;
  }

  private setHeaders(
    response: any,
    status: { limit: number; remaining: number; resetTime: Date; dailyQuota: number; dailyRemaining: number },
    remaining: number,
  ): void {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': status.limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': status.resetTime.toISOString(),
    };
    if (status.dailyQuota > 0) {
      headers['X-Quota-Limit'] = status.dailyQuota.toString();
      headers['X-Quota-Remaining'] = status.dailyRemaining.toString();
    }
    if (remaining === 0) {
      headers['Retry-After'] = Math.ceil(
        (status.resetTime.getTime() - Date.now()) / 1000,
      ).toString();
    }
    response.set(headers);
  }
}
