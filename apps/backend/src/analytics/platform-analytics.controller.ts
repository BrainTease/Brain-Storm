import { Controller, Get, Post, Query, Res, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { EventsService } from './events.service';
import { CORE_EVENTS } from './event-taxonomy';

class TrackEventDto {
  eventId: string;
  eventType: string;
  timestamp: string;
  userId?: string;
  sessionId: string;
  source: 'web' | 'mobile' | 'api';
  locale?: string;
  payload: Record<string, unknown>;
}

@ApiTags('analytics')
@Controller('v1/analytics')
export class PlatformAnalyticsController {
  constructor(
    private readonly platformAnalyticsService: PlatformAnalyticsService,
    private readonly eventsService: EventsService,
  ) {}

  @Post('events')
  @ApiOperation({ summary: 'Track an analytics event from client' })
  async trackEvent(@Body() dto: TrackEventDto) {
    // Validate event type
    const validEventTypes = Object.values(CORE_EVENTS);
    if (!validEventTypes.includes(dto.eventType as typeof CORE_EVENTS[keyof typeof CORE_EVENTS])) {
      return { success: false, error: 'Invalid event type' };
    }
    
    // Emit event for storage
    await this.eventsService.handleEvent(dto.eventType, {
      ...dto.payload,
      userId: dto.userId,
      sessionId: dto.sessionId,
    });
    
    return { success: true };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get platform dashboard analytics' })
  getDashboard() {
    return this.platformAnalyticsService.aggregatePlatform();
  }

  @Get('events')
  @ApiOperation({ summary: 'Get analytics events with filtering' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'endDate', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  async getEvents(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('eventType') eventType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('courseId') courseId?: string,
  ) {
    const [events, total] = await this.eventsService.findEvents({
      limit,
      offset,
      eventType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userId,
      courseId,
    });
    return { events, total };
  }

  @Get('events/export')
  @ApiOperation({ summary: 'Export analytics events as CSV' })
  async exportEvents(
    @Query('eventType') eventType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('courseId') courseId?: string,
    @Res() res: any,
  ) {
    const [events] = await this.eventsService.findEvents({
      eventType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userId,
      courseId,
    });

    const csvHeader = 'id,eventType,payload,timestamp,userId,courseId\n';
    const csvRows = events.map((event) => {
      const payload = event.payload.replace(/"/g, '""'); // Escape double quotes
      return `"${event.id}","${event.eventType}","${payload}","${event.timestamp.toISOString()}","${event.userId ?? ''}","${event.courseId ?? ''}"`;
    });
    const csv = csvHeader + csvRows.join('\n');

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=analytics-events.csv',
    });
    res.send(csv);
  }
}