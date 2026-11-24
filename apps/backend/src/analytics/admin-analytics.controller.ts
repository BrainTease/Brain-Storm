import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

import { AdminDashboardQueryDto, ExportQueryDto } from './admin-analytics.dto';
import { AdminAnalyticsService } from './admin-analytics.service';

@ApiTags('admin-analytics')
@ApiBearerAuth()
@Controller('v1/admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAnalyticsController {
  constructor(private readonly service: AdminAnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard metrics with date filtering' })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO date string' })
  getDashboard(@Query() query: AdminDashboardQueryDto) {
    return this.service.getDashboardMetrics(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export analytics metrics as CSV' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async exportMetrics(@Query() query: ExportQueryDto, @Res() res: Response) {
    const csv = await this.service.exportMetrics(query);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=admin-analytics.csv',
    });
    res.send(csv);
  }
}
