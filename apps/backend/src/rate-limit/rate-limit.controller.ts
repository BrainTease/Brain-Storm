import { Controller, Get, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  UserRateLimitService,
  ROLE_RATE_LIMITS,
  PLAN_RATE_LIMITS,
  ENDPOINT_RATE_LIMITS,
} from './user-rate-limit.service';

@ApiTags('rate-limit')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: UserRateLimitService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current rate-limit & quota status for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Rate-limit status including window limit, remaining, and daily quota',
    schema: {
      example: {
        limit: 1000, remaining: 987, resetTime: '2026-06-26T16:00:00.000Z',
        dailyQuota: 10000, dailyUsed: 13, dailyRemaining: 9987,
      },
    },
  })
  getMyStatus(@Request() req: any) {
    return this.rateLimitService.getRateLimitStatus(
      req.user.id,
      req.user.role || 'guest',
      undefined,
      req.user.plan,
    );
  }

  @Get('config')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get full rate-limit configuration (admin only)' })
  @ApiResponse({ status: 200, description: 'Role, plan, and endpoint rate-limit configs' })
  getConfig() {
    return { roleLimits: ROLE_RATE_LIMITS, planLimits: PLAN_RATE_LIMITS, endpointLimits: ENDPOINT_RATE_LIMITS };
  }

  @Delete('users/:userId/reset')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Reset rate-limit counters for a specific user (admin only)' })
  @ApiResponse({ status: 200, description: 'Counters reset' })
  async resetUserLimit(@Param('userId') userId: string) {
    await this.rateLimitService.resetUserLimit(userId);
    return { success: true, message: `Rate limit reset for user ${userId}` };
  }
}
