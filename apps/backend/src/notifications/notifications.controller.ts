import { Controller, Get, Patch, Post, Delete, Param, Body, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationType } from './notification.entity';
import { IsEnum, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ScheduleNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ description: 'ISO 8601 datetime' })
  @IsDateString()
  scheduledAt: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  @ApiResponse({ status: 200, description: 'Returns user notifications' })
  findAll(@Request() req) {
    return this.notificationsService.findByUser(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  // ── Preferences ──────────────────────────────────────────────────────────

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for the current user' })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  getPreferences(@Request() req) {
    return this.notificationsService.getPreferences(req.user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiBody({ schema: { example: { inApp: true, email: true, push: false, enrollment: true, completion: true } } })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  updatePreferences(@Request() req, @Body() body: Record<string, boolean>) {
    return this.notificationsService.updatePreferences(req.user.id, body as any);
  }

  // ── Scheduling ───────────────────────────────────────────────────────────

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a notification for future delivery' })
  @ApiResponse({ status: 201, description: 'Notification scheduled' })
  scheduleNotification(@Request() req, @Body() dto: ScheduleNotificationDto) {
    return this.notificationsService.schedule(req.user.id, dto.type, dto.message, new Date(dto.scheduledAt));
  }

  @Delete('schedule/:id')
  @ApiOperation({ summary: 'Cancel a scheduled notification' })
  @ApiResponse({ status: 200, description: 'Scheduled notification cancelled' })
  @ApiResponse({ status: 404, description: 'Scheduled notification not found' })
  cancelScheduled(@Param('id') id: string) {
    return this.notificationsService.cancelScheduled(id);
  }
}
