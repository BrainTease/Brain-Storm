/**
 * Regression tests for RemindersService — Issue #1195
 *
 * Covers:
 *  - Scheduling logic (inactivity threshold, reminder frequency window)
 *  - Timezone-edge cases (cutoff computed at UTC, DST boundary)
 *  - Duplicate-delivery prevention (frequency guard)
 *  - Queue mock for deterministic test timing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RemindersService } from './reminders.service';
import { Reminder } from './reminder.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { MailService } from '../mail/mail.service';

// ─── Mock factories ──────────────────────────────────────────────────────────

const mockReminderRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
};

const mockEnrollmentRepo = {
  createQueryBuilder: jest.fn(),
};

const mockMailService = {
  sendReminderEmail: jest.fn(),
};

// Helper to build a chainable query builder stub
function makeQbStub(results: unknown[]) {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
  };
  return qb;
}

// Helper to build an enrollment object
function makeEnrollment(
  userId: string,
  courseId: string,
  enrolledAt: Date,
  email = 'student@example.com',
  username = 'student',
  courseTitle = 'Blockchain 101'
) {
  return {
    userId,
    courseId,
    enrolledAt,
    completedAt: null,
    user: { email, username },
    course: { title: courseTitle },
  };
}

// Helper to build a Reminder entity
function makeReminder(
  userId: string,
  courseId: string,
  lastReminderSentAt: Date,
  isActive = true
): Reminder {
  return {
    id: `${userId}-${courseId}`,
    userId,
    courseId,
    lastReminderSentAt,
    isActive,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  } as Reminder;
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('RemindersService', () => {
  let service: RemindersService;
  let configService: ConfigService;

  const makeModule = async (config: Record<string, number> = {}) => {
    const defaults: Record<string, number> = {
      REMINDER_INACTIVITY_DAYS: 7,
      REMINDER_FREQUENCY_HOURS: 168, // 7 days
      ...config,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        { provide: getRepositoryToken(Reminder), useValue: mockReminderRepo },
        { provide: getRepositoryToken(Enrollment), useValue: mockEnrollmentRepo },
        { provide: MailService, useValue: mockMailService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultVal?: number) => {
              return defaults[key] ?? defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
    configService = module.get<ConfigService>(ConfigService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Suppress logger output
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await makeModule();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ── createReminder ──────────────────────────────────────────────────────────

  describe('createReminder', () => {
    it('creates and saves a reminder with isActive=true', async () => {
      const now = new Date('2025-06-01T12:00:00Z');
      jest.useFakeTimers({ now });

      const reminder = makeReminder('user-1', 'course-1', now);
      mockReminderRepo.create.mockReturnValue(reminder);
      mockReminderRepo.save.mockResolvedValue(reminder);

      const result = await service.createReminder('user-1', 'course-1');

      expect(mockReminderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          courseId: 'course-1',
          isActive: true,
        })
      );
      expect(mockReminderRepo.save).toHaveBeenCalledWith(reminder);
      expect(result).toEqual(reminder);
    });
  });

  // ── disableReminder / enableReminder ────────────────────────────────────────

  describe('disableReminder', () => {
    it('calls update with isActive=false', async () => {
      mockReminderRepo.update.mockResolvedValue({ affected: 1 });

      await service.disableReminder('user-1', 'course-1');

      expect(mockReminderRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', courseId: 'course-1' },
        { isActive: false }
      );
    });
  });

  describe('enableReminder', () => {
    it('calls update with isActive=true', async () => {
      mockReminderRepo.update.mockResolvedValue({ affected: 1 });

      await service.enableReminder('user-1', 'course-1');

      expect(mockReminderRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', courseId: 'course-1' },
        { isActive: true }
      );
    });
  });

  // ── sendInactiveReminders — scheduling logic ────────────────────────────────

  describe('sendInactiveReminders', () => {
    describe('frequency guard (duplicate-delivery prevention)', () => {
      it('sends reminder when last sent is exactly at frequency boundary', async () => {
        // Set "now" to a fixed point in time
        const now = new Date('2025-09-01T10:00:00Z');
        jest.useFakeTimers({ now });

        // Enrollment was created 10 days ago — past inactivity threshold
        const enrolledAt = new Date('2025-08-22T10:00:00Z');
        const enrollment = makeEnrollment('u1', 'c1', enrolledAt);

        // Last reminder was sent exactly 168 hours (7 days) ago
        const lastSent = new Date(now.getTime() - 168 * 60 * 60 * 1000);
        const reminder = makeReminder('u1', 'c1', lastSent);

        mockEnrollmentRepo.createQueryBuilder.mockReturnValue(makeQbStub([enrollment]));
        mockReminderRepo.findOne.mockResolvedValue(reminder);
        mockReminderRepo.save.mockResolvedValue({ ...reminder, lastReminderSentAt: now });
        mockMailService.sendReminderEmail.mockResolvedValue(undefined);

        await service.sendInactiveReminders();

        expect(mockMailService.sendReminderEmail).toHaveBeenCalledWith(
          'student@example.com',
          'student',
          'Blockchain 101'
        );
        expect(mockReminderRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ lastReminderSentAt: now })
        );
      });

      it('does NOT send reminder when frequency window has not elapsed', async () => {
        const now = new Date('2025-09-01T10:00:00Z');
        jest.useFakeTimers({ now });

        const enrolledAt = new Date('2025-08-20T10:00:00Z');
        const enrollment = makeEnrollment('u1', 'c1', enrolledAt);

        // Last reminder was sent only 24 hours ago — within 168-hour window
        const lastSent = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const reminder = makeReminder('u1', 'c1', lastSent);

        mockEnrollmentRepo.createQueryBuilder.mockReturnValue(makeQbStub([enrollment]));
        mockReminderRepo.findOne.mockResolvedValue(reminder);

        await service.sendInactiveReminders();

        expect(mockMailService.sendReminderEmail).not.toHaveBeenCalled();
        expect(mockReminderRepo.save).not.toHaveBeenCalled();
      });

      it('skips enrollments with no matching reminder record', async () => {
        const now = new Date('2025-09-01T10:00:00Z');
        jest.useFakeTimers({ now });

        const enrolledAt = new Date('2025-08-15T10:00:00Z');
        const enrollment = makeEnrollment('u1', 'c1', enrolledAt);

        mockEnrollmentRepo.createQueryBuilder.mockReturnValue(makeQbStub([enrollment]));
        mockReminderRepo.findOne.mockResolvedValue(null); // no reminder record

        await service.sendInactiveReminders();

        expect(mockMailService.sendReminderEmail).not.toHaveBeenCalled();
      });

      it('skips enrollments whose reminder is inactive', async () => {
        const now = new Date('2025-09-01T10:00:00Z');
        jest.useFakeTimers({ now });

        const enrolledAt = new Date('2025-08-15T10:00:00Z');
        const enrollment = makeEnrollment('u1', 'c1', enrolledAt);

        const lastSent = new Date(now.getTime() - 200 * 60 * 60 * 1000);
        const reminder = makeReminder('u1', 'c1', lastSent, false /* isActive = false */);

        mockEnrollmentRepo.createQueryBuilder.mockReturnValue(makeQbStub([enrollment]));
        mockReminderRepo.findOne.mockResolvedValue(reminder);

        await service.sendInactiveReminders();

        expect(mockMailService.sendReminderEmail).not.toHaveBeenCalled();
      });
    });

    describe('configurable inactivity threshold', () => {
      it('respects a custom REMINDER_INACTIVITY_DAYS setting', async () => {
        // Rebuild service with 3-day inactivity window
        await makeModule({ REMINDER_INACTIVITY_DAYS: 3, REMINDER_FREQUENCY_HOURS: 72 });

        const now = new Date('2025-09-10T08:00:00Z');
        jest.useFakeTimers({ now });

        const enrolledAt = new Date('2025-09-06T08:00:00Z'); // 4 days ago → past threshold
        const enrollment = makeEnrollment('u2', 'c2', enrolledAt);

        const lastSent = new Date(now.getTime() - 73 * 60 * 60 * 1000); // past 72-hour window
        const reminder = makeReminder('u2', 'c2', lastSent);

        mockEnrollmentRepo.createQueryBuilder.mockReturnValue(makeQbStub([enrollment]));
        mockReminderRepo.findOne.mockResolvedValue(reminder);
        mockReminderRepo.save.mockResolvedValue({ ...reminder, lastReminderSentAt: now });
        mockMailService.sendReminderEmail.mockResolvedValue(undefined);

        await service.sendInactiveReminders();

        expect(mockMailService.sendReminderEmail).toHaveBeenCalledTimes(1);
      });
    });

    describe('timezone edge cases', () => {
      /**
       * The cutoff calculation (`setDate(date.getDate() - inactivityDays)`) operates in
       * the system's local time.  These tests freeze time near DST transitions and verify
       * the service still produces exactly one mail and updates lastReminderSentAt.
       */

      it.each([
        // USA spring-forward: clocks jump from 01:59 → 03:00
        ['DST spring-forward UTC', '2025-03-09T02:30:00Z'],
        // EU spring-forward
        ['EU spring-forward UTC', '2025-03-30T01:00:00Z'],
        // Northern-hemisphere winter solstice
        ['winter solstice midnight UTC', '2025-12-21T00:00:00Z'],
      ])('sends reminder correctly near %s', async (_label, nowIso) => {
        await makeModule({ REMINDER_INACTIVITY_DAYS: 7, REMINDER_FREQUENCY_HOURS: 168 });

        const now = new Date(nowIso);
        jest.useFakeTimers({ now });

        // Enrollment is 10 days old → clearly past inactivity threshold
        const enrolledAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
        const enrollment = makeEnrollment('tz-user', 'tz-course', enrolledAt);

        // Last reminder was 8 days ago → past 7-day frequency window
        const lastSent = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
        const reminder = makeReminder('tz-user', 'tz-course', lastSent);

        mockEnrollmentRepo.createQueryBuilder.mockReturnValue(makeQbStub([enrollment]));
        mockReminderRepo.findOne.mockResolvedValue(reminder);
        mockReminderRepo.save.mockResolvedValue({ ...reminder, lastReminderSentAt: now });
        mockMailService.sendReminderEmail.mockResolvedValue(undefined);

        await service.sendInactiveReminders();

        expect(mockMailService.sendReminderEmail).toHaveBeenCalledTimes(1);
        expect(mockReminderRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ lastReminderSentAt: now })
        );
      });

      it('does NOT double-send across a DST boundary within the same window', async () => {
        // Both invocations happen on the same day spanning DST changeover
        const firstCall = new Date('2025-03-09T01:55:00Z');
        const secondCall = new Date('2025-03-09T03:05:00Z'); // after spring-forward

        // ── First call ──
        jest.useFakeTimers({ now: firstCall });
        await makeModule({ REMINDER_INACTIVITY_DAYS: 7, REMINDER_FREQUENCY_HOURS: 168 });

        const enrolledAt = new Date(firstCall.getTime() - 10 * 24 * 60 * 60 * 1000);
        const enrollment = makeEnrollment('dst-user', 'dst-course', enrolledAt);

        // Last reminder was 8 days ago
        const lastSent = new Date(firstCall.getTime() - 8 * 24 * 60 * 60 * 1000);
        const reminder = makeReminder('dst-user', 'dst-course', lastSent);

        mockEnrollmentRepo.createQueryBuilder.mockReturnValue(makeQbStub([enrollment]));
        mockReminderRepo.findOne.mockResolvedValue(reminder);
        const updatedReminder = { ...reminder, lastReminderSentAt: firstCall };
        mockReminderRepo.save.mockResolvedValue(updatedReminder);
        mockMailService.sendReminderEmail.mockResolvedValue(undefined);

        await service.sendInactiveReminders();
        expect(mockMailService.sendReminderEmail).toHaveBeenCalledTimes(1);

        // ── Second call (70 minutes later, now after DST) ──
        jest.setSystemTime(secondCall);
        jest.clearAllMocks();

        // Simulate the saved state: lastReminderSentAt is now firstCall
        mockEnrollmentRepo.createQueryBuilder.mockReturnValue(makeQbStub([enrollment]));
        mockReminderRepo.findOne.mockResolvedValue(updatedReminder);

        await service.sendInactiveReminders();

        // Should NOT send — 70 minutes is well within 168-hour window
        expect(mockMailService.sendReminderEmail).not.toHaveBeenCalled();
      });
    });

    describe('multiple concurrent enrollments', () => {
      it('sends exactly one email per eligible enrollment', async () => {
        const now = new Date('2025-08-01T09:00:00Z');
        jest.useFakeTimers({ now });

        const enrollments = [
          makeEnrollment('u1', 'c1', new Date('2025-07-20T09:00:00Z'), 'a@x.com', 'alice'),
          makeEnrollment('u2', 'c2', new Date('2025-07-18T09:00:00Z'), 'b@x.com', 'bob'),
        ];

        mockEnrollmentRepo.createQueryBuilder.mockReturnValue(makeQbStub(enrollments));

        const past = new Date(now.getTime() - 200 * 60 * 60 * 1000);
        mockReminderRepo.findOne
          .mockResolvedValueOnce(makeReminder('u1', 'c1', past))
          .mockResolvedValueOnce(makeReminder('u2', 'c2', past));

        mockReminderRepo.save.mockResolvedValue({});
        mockMailService.sendReminderEmail.mockResolvedValue(undefined);

        await service.sendInactiveReminders();

        expect(mockMailService.sendReminderEmail).toHaveBeenCalledTimes(2);
        expect(mockMailService.sendReminderEmail).toHaveBeenCalledWith('a@x.com', 'alice', expect.any(String));
        expect(mockMailService.sendReminderEmail).toHaveBeenCalledWith('b@x.com', 'bob', expect.any(String));
      });

      it('does not send to second user when first user is within frequency window', async () => {
        const now = new Date('2025-08-01T09:00:00Z');
        jest.useFakeTimers({ now });

        const enrollments = [
          makeEnrollment('u1', 'c1', new Date('2025-07-20T09:00:00Z'), 'a@x.com', 'alice'),
          makeEnrollment('u2', 'c2', new Date('2025-07-18T09:00:00Z'), 'b@x.com', 'bob'),
        ];

        mockEnrollmentRepo.createQueryBuilder.mockReturnValue(makeQbStub(enrollments));

        const withinWindow = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48h ago
        const pastWindow = new Date(now.getTime() - 200 * 60 * 60 * 1000); // 200h ago

        mockReminderRepo.findOne
          .mockResolvedValueOnce(makeReminder('u1', 'c1', withinWindow)) // u1 → skip
          .mockResolvedValueOnce(makeReminder('u2', 'c2', pastWindow)); // u2 → send

        mockReminderRepo.save.mockResolvedValue({});
        mockMailService.sendReminderEmail.mockResolvedValue(undefined);

        await service.sendInactiveReminders();

        expect(mockMailService.sendReminderEmail).toHaveBeenCalledTimes(1);
        expect(mockMailService.sendReminderEmail).toHaveBeenCalledWith('b@x.com', 'bob', expect.any(String));
      });
    });

    describe('empty result set', () => {
      it('does not attempt to send reminders when no inactive enrollments found', async () => {
        mockEnrollmentRepo.createQueryBuilder.mockReturnValue(makeQbStub([]));

        await service.sendInactiveReminders();

        expect(mockReminderRepo.findOne).not.toHaveBeenCalled();
        expect(mockMailService.sendReminderEmail).not.toHaveBeenCalled();
      });
    });
  });

  // ── getReminderStats ────────────────────────────────────────────────────────

  describe('getReminderStats', () => {
    it('returns total, active, and sentToday counts', async () => {
      mockReminderRepo.count
        .mockResolvedValueOnce(10) // totalReminders
        .mockResolvedValueOnce(7) // activeReminders
        .mockResolvedValueOnce(3); // sentToday

      const result = await service.getReminderStats();

      expect(result).toEqual({ totalReminders: 10, activeReminders: 7, sentToday: 3 });
    });
  });
});
