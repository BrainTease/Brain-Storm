import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { InstructorAnalyticsService } from './instructor-analytics.service';
import { AnalyticsQueryDto } from './dto/instructor-analytics.dto.ts';
import { Cacheable } from '../cache/cache.decorators';
import { CacheKeys } from '../cache/cache-invalidation.service';

@Controller('v1/analytics/instructor')
@UseGuards(JwtAuthGuard)
export class InstructorAnalyticsController {
  constructor(private analyticsService: InstructorAnalyticsService) {}

  @Get()
  @Cacheable(3600, CacheKeys.INSTRUCTOR_ANALYTICS) // Cache for 1 hour
  async getAnalytics(
    @CurrentUser() user: any,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getInstructorAnalytics(user.id, query);
  }

  @Get('export/csv')
  async exportToCSV(
    @CurrentUser() user: any,
    @Query() query: AnalyticsQueryDto,
    @Res() response: Response,
  ) {
    const csv = await this.analyticsService.exportAnalyticsToCSV(user.id, query);
    response.setHeader('Content-Type', 'text/csv');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="analytics-${new Date().toISOString()}.csv"`,
    );
    response.send(csv);
  }
}
