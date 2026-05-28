import { Module } from '@nestjs/common';
import { UserRateLimitService } from './user-rate-limit.service';
import { UserRateLimitGuard } from './user-rate-limit.guard';
import { RateLimitController } from './rate-limit.controller';

@Module({
  controllers: [RateLimitController],
  providers: [UserRateLimitService, UserRateLimitGuard],
  exports: [UserRateLimitService, UserRateLimitGuard],
})
export class RateLimitModule {}
