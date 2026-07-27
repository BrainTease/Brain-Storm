import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RedisLeaderboardService } from './redis-leaderboard.service';

@ApiTags('leaderboard')
@Controller('v1/leaderboard')
export class RedisLeaderboardController {
  constructor(private readonly service: RedisLeaderboardService) {}

  @Get('global')
  @ApiOperation({ summary: 'Get paginated global leaderboard (Redis sorted set, O(log n))' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated global leaderboard' })
  getGlobal(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.service.getPage('global', null, page, Math.min(pageSize, 100));
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get paginated leaderboard for a specific course' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated course leaderboard' })
  getCourse(
    @Param('courseId') courseId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.service.getPage('course', courseId, page, Math.min(pageSize, 100));
  }

  @Get('cohort/:cohortId')
  @ApiOperation({ summary: 'Get paginated leaderboard for a specific cohort' })
  @ApiParam({ name: 'cohortId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated cohort leaderboard' })
  getCohort(
    @Param('cohortId') cohortId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.service.getPage('cohort', cohortId, page, Math.min(pageSize, 100));
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the authenticated user\'s rank and surrounding entries (around-me)' })
  @ApiQuery({ name: 'scope', required: false, enum: ['global', 'course', 'cohort'] })
  @ApiQuery({ name: 'scopeId', required: false, type: String })
  @ApiQuery({ name: 'radius', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User rank + nearby entries' })
  async getAroundMe(
    @Request() req: any,
    @Query('scope') scope: 'global' | 'course' | 'cohort' = 'global',
    @Query('scopeId') scopeId: string | undefined,
    @Query('radius', new DefaultValuePipe(5), ParseIntPipe) radius: number,
  ) {
    const userId: string = req.user.userId;
    const [userRank, nearby] = await Promise.all([
      this.service.getUserRank(scope, scopeId ?? null, userId),
      this.service.getAroundMe(scope, scopeId ?? null, userId, Math.min(radius, 20)),
    ]);
    return { userRank, nearby };
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top-N entries for any scope (no pagination)' })
  @ApiQuery({ name: 'scope', required: false, enum: ['global', 'course', 'cohort'] })
  @ApiQuery({ name: 'scopeId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top entries for the given scope' })
  getTop(
    @Query('scope') scope: 'global' | 'course' | 'cohort' = 'global',
    @Query('scopeId') scopeId: string | undefined,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.service.getTopEntries(scope, scopeId ?? null, Math.min(limit, 100));
  }
}
