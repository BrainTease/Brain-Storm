import { Module } from '@nestjs/common';
import { UserRateLimitService } from './user-rate-limit.service';
import { UserRateLimitGuard } from './user-rate-limit.guard';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { RateLimitController } from './rate-limit.controller';

@Module({
  controllers: [RateLimitController],
  providers: [UserRateLimitService, UserRateLimitGuard, RateLimitMiddleware],
  exports: [UserRateLimitService, UserRateLimitGuard, RateLimitMiddleware],
})
export class RateLimitModule {}
