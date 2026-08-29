import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { CohortSession, SessionStatus } from './session.entity';
import { SessionAttendance, AttendanceStatus } from './session-attendance.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSessionDto } from './dto/session.dto';

// Suppress ics/schedule decorator side-effects in unit tests
jest.mock('ics', () => ({
  createEvent: jest.fn(() => ({ error: null, value: 'BEGIN:VCALENDAR\nEND:VCALENDAR' })),
}));

describe('SessionsService', () => {
  let service: SessionsService;

  const mockSessionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };
  const mockAttendanceRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const mockNotifications = {
    scheduleNotification: jest.fn().mockResolvedValue(undefined),
  };

  const makeSession = (overrides: Partial<CohortSession> = {}): CohortSession =>
    ({
      id: 's1',
      cohortId: 'coh-1',
      instructorId: 'ins-1',
      title: 'Intro to Rust',
      description: 'First session',
      startTime: new Date('2030-01-15T10:00:00Z'),
      endTime: new Date('2030-01-15T11:00:00Z'),
      status: SessionStatus.SCHEDULED,
      ...overrides,
    }) as CohortSession;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getRepositoryToken(CohortSession), useValue: mockSessionRepo },
        { provide: getRepositoryToken(SessionAttendance), useValue: mockAttendanceRepo },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createSession ─────────────────────────────────────────────────────────────

  describe('createSession', () => {
    const dto: CreateSessionDto = {
      title: 'Intro to Rust',
      description: 'First session',
      startTime: new Date('2030-01-15T10:00:00Z'),
      endTime: new Date('2030-01-15T11:00:00Z'),
    };

    it('creates and saves a session with SCHEDULED status', async () => {
      const session = makeSession();
      mockSessionRepo.create.mockReturnValue(session);
      mockSessionRepo.save.mockResolvedValue(session);
      // scheduleReminders — findOne returns session with no cohort members
      mockSessionRepo.findOne.mockResolvedValue({ ...session, cohort: { members: [] } });

      const result = await service.createSession('coh-1', 'ins-1', dto);

      expect(mockSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cohortId: 'coh-1',
          instructorId: 'ins-1',
          status: SessionStatus.SCHEDULED,
        })
      );
      expect(result).toEqual(session);
    });

    it('schedules reminders for each cohort member', async () => {
      const session = makeSession();
      mockSessionRepo.create.mockReturnValue(session);
      mockSessionRepo.save.mockResolvedValue(session);
      mockSessionRepo.findOne.mockResolvedValue({
        ...session,
        cohort: {
          members: [{ user: { id: 'u1' } }, { user: { id: 'u2' } }],
        },
      });

      await service.createSession('coh-1', 'ins-1', dto);

      expect(mockNotifications.scheduleNotification).toHaveBeenCalledTimes(2);
    });
  });

  // ── getSession ────────────────────────────────────────────────────────────────

  describe('getSession', () => {
    it('returns session with relations', async () => {
      const session = makeSession();
      mockSessionRepo.findOne.mockResolvedValue(session);

      const result = await service.getSession('s1');

      expect(mockSessionRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's1' } })
      );
      expect(result).toEqual(session);
    });

    it('returns null when session not found', async () => {
      mockSessionRepo.findOne.mockResolvedValue(null);
      const result = await service.getSession('missing');
      expect(result).toBeNull();
    });
  });

  // ── recordAttendance ──────────────────────────────────────────────────────────

  describe('recordAttendance', () => {
    it('creates a new attendance record when none exists', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      const attendance = {
        sessionId: 's1',
        userId: 'u1',
        status: AttendanceStatus.PRESENT,
      } as SessionAttendance;
      mockAttendanceRepo.create.mockReturnValue(attendance);
      mockAttendanceRepo.save.mockResolvedValue(attendance);

      const result = await service.recordAttendance('s1', 'u1');

      expect(mockAttendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 's1', userId: 'u1', status: AttendanceStatus.PRESENT })
      );
      expect(result).toEqual(attendance);
    });

    it('updates status when attendance record already exists', async () => {
      const existing = {
        sessionId: 's1',
        userId: 'u1',
        status: AttendanceStatus.PRESENT,
      } as SessionAttendance;
      mockAttendanceRepo.findOne.mockResolvedValue(existing);
      mockAttendanceRepo.save.mockImplementation((a: any) => Promise.resolve(a));

      await service.recordAttendance('s1', 'u1', AttendanceStatus.LATE);

      expect(existing.status).toBe(AttendanceStatus.LATE);
      expect(mockAttendanceRepo.create).not.toHaveBeenCalled();
    });

    it('defaults status to PRESENT when not specified', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue(null);
      const attendance = {
        sessionId: 's1',
        userId: 'u1',
        status: AttendanceStatus.PRESENT,
      } as SessionAttendance;
      mockAttendanceRepo.create.mockReturnValue(attendance);
      mockAttendanceRepo.save.mockResolvedValue(attendance);

      await service.recordAttendance('s1', 'u1');

      expect(mockAttendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: AttendanceStatus.PRESENT })
      );
    });
  });

  // ── generateCalendarInvite ────────────────────────────────────────────────────

  describe('generateCalendarInvite', () => {
    it('returns ICS string for an existing session', async () => {
      const session = makeSession();
      mockSessionRepo.findOne.mockResolvedValue(session);

      const result = await service.generateCalendarInvite('s1');

      expect(result).toContain('VCALENDAR');
    });

    it('throws when session not found', async () => {
      mockSessionRepo.findOne.mockResolvedValue(null);

      await expect(service.generateCalendarInvite('missing')).rejects.toThrow('Session not found');
    });
  });

  // ── markSessionRecording ──────────────────────────────────────────────────────

  describe('markSessionRecording', () => {
    it('updates the recordingUrl for the session', async () => {
      mockSessionRepo.update.mockResolvedValue({ affected: 1 });

      await service.markSessionRecording('s1', 'https://cdn.example.com/rec.mp4');

      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        { id: 's1' },
        { recordingUrl: 'https://cdn.example.com/rec.mp4' }
      );
    });
  });
});
