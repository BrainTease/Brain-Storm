import { Controller, Post, Get, Patch, UseGuards, Body, Param } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/reminders')
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  @Post('send-inactive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async sendInactiveReminders() {
    await this.remindersService.sendInactiveReminders();
    return { message: 'Reminders sent successfully' };
  }

  @Post(':userId/:courseId')
  @UseGuards(JwtAuthGuard)
  async createReminder(@Param('userId') userId: string, @Param('courseId') courseId: string) {
    return this.remindersService.createReminder(userId, courseId);
  }

  @Patch(':userId/:courseId/disable')
  @UseGuards(JwtAuthGuard)
  async disableReminder(@Param('userId') userId: string, @Param('courseId') courseId: string) {
    await this.remindersService.disableReminder(userId, courseId);
    return { message: 'Reminder disabled' };
  }

  @Patch(':userId/:courseId/enable')
  @UseGuards(JwtAuthGuard)
  async enableReminder(@Param('userId') userId: string, @Param('courseId') courseId: string) {
    await this.remindersService.enableReminder(userId, courseId);
    return { message: 'Reminder enabled' };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getReminderStats() {
    return this.remindersService.getReminderStats();
  }
}
