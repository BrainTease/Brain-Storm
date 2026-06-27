import { Controller, Get, Delete, Param, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  UserRateLimitService,
  ROLE_RATE_LIMITS,
  ENDPOINT_RATE_LIMITS,
} from './user-rate-limit.service';

@ApiTags('rate-limit')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: UserRateLimitService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current rate limit status for the authenticated user' })
  getMyStatus(@Request() req) {
    return this.rateLimitService.getRateLimitStatus(req.user.id, req.user.role || 'guest');
  }

  @Get('config')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get rate limit configuration (admin)' })
  getConfig() {
    return { roleLimits: ROLE_RATE_LIMITS, planLimits: PLAN_RATE_LIMITS, endpointLimits: ENDPOINT_RATE_LIMITS };
  }

  @Delete('users/:userId/reset')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Reset rate limit for a user (admin)' })
  async resetUserLimit(@Param('userId') userId: string) {
    await this.rateLimitService.resetUserLimit(userId);
    return { success: true };
  }

  @Post('allowlist/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Add user to rate-limit allowlist (admin)' })
  addToAllowlist(@Param('userId') userId: string) {
    this.rateLimitService.addToAllowlist(userId);
    return { success: true, userId };
  }

  @Delete('allowlist/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Remove user from rate-limit allowlist (admin)' })
  removeFromAllowlist(@Param('userId') userId: string) {
    this.rateLimitService.removeFromAllowlist(userId);
    return { success: true, userId };
  }
}
