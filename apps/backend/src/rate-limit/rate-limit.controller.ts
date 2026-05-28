import { Controller, Get, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRateLimitService, ROLE_RATE_LIMITS, ENDPOINT_RATE_LIMITS } from './user-rate-limit.service';

@ApiTags('rate-limit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: UserRateLimitService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current rate limit status for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Rate limit status' })
  getMyStatus(@Request() req) {
    return this.rateLimitService.getRateLimitStatus(req.user.id, req.user.role || 'guest');
  }

  @Get('config')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get rate limit configuration (admin only)' })
  @ApiResponse({ status: 200, description: 'Rate limit configuration' })
  getConfig() {
    return { roleLimits: ROLE_RATE_LIMITS, endpointLimits: ENDPOINT_RATE_LIMITS };
  }

  @Delete('users/:userId/reset')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Reset rate limit for a specific user (admin only)' })
  @ApiResponse({ status: 200, description: 'Rate limit reset' })
  async resetUserLimit(@Param('userId') userId: string) {
    await this.rateLimitService.resetUserLimit(userId);
    return { success: true, message: `Rate limit reset for user ${userId}` };
  }
}
