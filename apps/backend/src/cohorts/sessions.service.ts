import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan } from 'typeorm';
import { CohortSession, SessionStatus } from './session.entity';
import { SessionAttendance, AttendanceStatus } from './session-attendance.entity';
import { CreateSessionDto } from './dto/session.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as ics from 'ics';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(CohortSession) private sessionRepo: Repository<CohortSession>,
    @InjectRepository(SessionAttendance) private attendanceRepo: Repository<SessionAttendance>,
    @Inject(forwardRef(() => NotificationsService)) private notificationsService: NotificationsService,
  ) {}

  async createSession(cohortId: string, instructorId: string, dto: CreateSessionDto) {
    const session = this.sessionRepo.create({
      cohortId,
      instructorId,
      ...dto,
      status: SessionStatus.SCHEDULED,
    });
    const saved = await this.sessionRepo.save(session);
    await this.scheduleReminders(saved);
    return saved;
  }

  async getSession(id: string) {
    return this.sessionRepo.findOne({
      where: { id },
      relations: ['cohort', 'cohort.members', 'cohort.members.user', 'attendances', 'attendances.user'],
    });
  }

  async getSessionsByCohort(cohortId: string) {
    return this.sessionRepo.find({
      where: { cohortId },
      relations: ['attendances'],
      order: { startTime: 'ASC' },
    });
  }

  async recordAttendance(sessionId: string, userId: string, status: AttendanceStatus = AttendanceStatus.PRESENT) {
    const attendance = await this.attendanceRepo.findOne({
      where: { sessionId, userId },
    });

    if (attendance) {
      attendance.status = status;
      attendance.joinedAt = new Date();
      return this.attendanceRepo.save(attendance);
    }

    const newAttendance = this.attendanceRepo.create({
      sessionId,
      userId,
      status,
      joinedAt: new Date(),
    });
    return this.attendanceRepo.save(newAttendance);
  }

  async getSessionAttendance(sessionId: string) {
    return this.attendanceRepo.find({
      where: { sessionId },
      relations: ['user'],
    });
  }

  async generateCalendarInvite(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const icsEvent = {
      title: session.title,
      description: session.description || '',
      start: [
        session.startTime.getUTCFullYear(),
        session.startTime.getUTCMonth() + 1,
        session.startTime.getUTCDate(),
        session.startTime.getUTCHours(),
        session.startTime.getUTCMinutes(),
      ] as [number, number, number, number, number],
      end: [
        session.endTime.getUTCFullYear(),
        session.endTime.getUTCMonth() + 1,
        session.endTime.getUTCDate(),
        session.endTime.getUTCHours(),
        session.endTime.getUTCMinutes(),
      ] as [number, number, number, number, number],
      duration: { hours: 1, minutes: 0 },
      busyStatus: 'BUSY',
    };

    const { error, value } = ics.createEvent(icsEvent);
    if (error) throw error;
    return value;
  }

  private async scheduleReminders(session: CohortSession) {
    const cohort = await this.sessionRepo.findOne({
      where: { id: session.id },
      relations: ['cohort', 'cohort.members', 'cohort.members.user'],
    });

    if (!cohort?.cohort?.members) return;

    // Schedule reminder 24 hours before
    const remindTime = new Date(session.startTime.getTime() - 24 * 60 * 60 * 1000);
    
    for (const member of cohort.cohort.members) {
      await this.notificationsService.scheduleNotification({
        userId: member.user.id,
        type: 'SESSION_REMINDER',
        message: `Reminder: Live session "${session.title}" starts in 24 hours at ${session.startTime.toLocaleString()}`,
        scheduledFor: remindTime,
      });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateSessionStatus() {
    const now = new Date();

    // Update sessions to LIVE if startTime has passed
    await this.sessionRepo.update(
      {
        status: SessionStatus.SCHEDULED,
        startTime: LessThanOrEqual(now),
      },
      { status: SessionStatus.LIVE },
    );

    // Update sessions to COMPLETED if endTime has passed
    await this.sessionRepo.update(
      {
        status: SessionStatus.LIVE,
        endTime: LessThanOrEqual(now),
      },
      { status: SessionStatus.COMPLETED },
    );
  }

  async markSessionRecording(sessionId: string, recordingUrl: string) {
    return this.sessionRepo.update({ id: sessionId }, { recordingUrl });
  }
}
