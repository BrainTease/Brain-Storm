import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationRouterService } from './notification-router.service';
import { NotificationPreference } from './notification-preference.entity';

@ApiTags('notification-preferences')
@Controller('notifications/preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationPreferencesController {
  constructor(private readonly router: NotificationRouterService) {}

  @Get()
  get(@Req() req: any) {
    return this.router.getPreference(req.user.id);
  }

  @Put()
  upsert(@Req() req: any, @Body() body: Partial<NotificationPreference>) {
    return this.router.upsertPreference(req.user.id, body);
  }
}
