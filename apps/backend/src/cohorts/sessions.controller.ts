import { Controller, Post, Get, UseGuards, Param, Body, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/session.dto';
import { AttendanceStatus } from './session-attendance.entity';

@Controller('v1/cohorts/:cohortId/sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Post()
  async createSession(
    @Param('cohortId') cohortId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSessionDto,
  ) {
    return this.sessionsService.createSession(cohortId, user.id, dto);
  }

  @Get()
  async getSessionsByCohort(@Param('cohortId') cohortId: string) {
    return this.sessionsService.getSessionsByCohort(cohortId);
  }

  @Get(':sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    return this.sessionsService.getSession(sessionId);
  }

  @Get(':sessionId/attendance')
  async getAttendance(@Param('sessionId') sessionId: string) {
    return this.sessionsService.getSessionAttendance(sessionId);
  }

  @Post(':sessionId/attendance')
  async recordAttendance(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
    @Query('status') status: AttendanceStatus = AttendanceStatus.PRESENT,
  ) {
    return this.sessionsService.recordAttendance(sessionId, user.id, status);
  }

  @Get(':sessionId/invite')
  async getCalendarInvite(@Param('sessionId') sessionId: string) {
    const ics = await this.sessionsService.generateCalendarInvite(sessionId);
    return { ics };
  }
}
