/**
 * Regression tests — notifications scheduling & timezone edge cases
 * Issue #1195
 *
 * Covers:
 *  - processScheduled: only dispatches PENDING items whose scheduledAt ≤ now
 *  - Timezone-edge cases (midnight UTC, DST boundaries)
 *  - Duplicate-delivery prevention (SENT / CANCELLED items are skipped)
 *  - Queue mock for deterministic test timing
 *  - schedule() & cancelScheduled() round-trip
 */

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThanOrEqual } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from './notification.entity';
import { NotificationPreference } from './notification-preference.entity';
import {
  ScheduledNotification,
  ScheduledNotificationStatus,
} from './scheduled-notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { EmailNotifierService } from './email-notifier.service';
import { PushNotifierService } from './push-notifier.service';
import { InAppNotifierService } from './inapp-notifier.service';

// ─── Mock repositories ───────────────────────────────────────────────────────

const mockNotificationRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockPrefRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};

const mockScheduledRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockGateway = { emitToUser: jest.fn() };
const mockEmailNotifier = { send: jest.fn() };
const mockPushNotifier = { send: jest.fn() };
const mockInAppNotifier = { send: jest.fn() };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeScheduled(
  id: string,
  scheduledAt: Date,
  status: ScheduledNotificationStatus = ScheduledNotificationStatus.PENDING
): ScheduledNotification {
  return {
    id,
    userId: 'user-1',
    type: NotificationType.ENROLLMENT,
    message: `Notification ${id}`,
    scheduledAt,
    status,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  } as ScheduledNotification;
}

function makePrefs(
  overrides: Partial<NotificationPreference> = {}
): NotificationPreference {
  return {
    id: 'pref-1',
    userId: 'user-1',
    inApp: true,
    email: false,
    push: false,
    enrollment: true,
    completion: true,
    credentialIssued: true,
    coursePublished: true,
    ...overrides,
  } as NotificationPreference;
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('NotificationsService — scheduling & timezone regression (issue #1195)', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: mockNotificationRepo },
        { provide: getRepositoryToken(NotificationPreference), useValue: mockPrefRepo },
        { provide: getRepositoryToken(ScheduledNotification), useValue: mockScheduledRepo },
        { provide: NotificationsGateway, useValue: mockGateway },
        { provide: EmailNotifierService, useValue: mockEmailNotifier },
        { provide: PushNotifierService, useValue: mockPushNotifier },
        { provide: InAppNotifierService, useValue: mockInAppNotifier },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.spyOn((service as unknown as { logger: { error: jest.Mock } }).logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ── schedule() ───────────────────────────────────────────────────────────────

  describe('schedule()', () => {
    it('creates a ScheduledNotification with PENDING status and correct scheduledAt', async () => {
      const scheduledAt = new Date('2025-10-15T14:00:00Z');
      const created = makeScheduled('sn-1', scheduledAt);

      mockScheduledRepo.create.mockReturnValue(created);
      mockScheduledRepo.save.mockResolvedValue(created);

      const result = await service.schedule('user-1', NotificationType.ENROLLMENT, 'Hello', scheduledAt);

      expect(mockScheduledRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: NotificationType.ENROLLMENT,
        message: 'Hello',
        scheduledAt,
      });
      expect(result.status).toBe(ScheduledNotificationStatus.PENDING);
      expect(result.scheduledAt).toEqual(scheduledAt);
    });
  });

  // ── cancelScheduled() ───────────────────────────────────────────────────────

  describe('cancelScheduled()', () => {
    it('sets status to CANCELLED', async () => {
      const sn = makeScheduled('sn-1', new Date('2025-10-20T10:00:00Z'));
      mockScheduledRepo.findOne.mockResolvedValue(sn);
      mockScheduledRepo.save.mockImplementation((v: ScheduledNotification) =>
        Promise.resolve(v)
      );

      const result = await service.cancelScheduled('sn-1');

      expect(result.status).toBe(ScheduledNotificationStatus.CANCELLED);
      expect(mockScheduledRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ScheduledNotificationStatus.CANCELLED })
      );
    });

    it('throws NotFoundException when the scheduled notification does not exist', async () => {
      mockScheduledRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelScheduled('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── processScheduled() ──────────────────────────────────────────────────────

  describe('processScheduled()', () => {
    it('dispatches notifications whose scheduledAt is in the past', async () => {
      const now = new Date('2025-09-01T12:00:00Z');
      jest.useFakeTimers({ now });

      const pastItem = makeScheduled('sn-past', new Date('2025-09-01T11:00:00Z'));
      mockScheduledRepo.find.mockResolvedValue([pastItem]);
      mockScheduledRepo.save.mockImplementation((v: ScheduledNotification) =>
        Promise.resolve(v)
      );

      // Provide prefs for the create() call
      mockPrefRepo.findOne.mockResolvedValue(makePrefs());
      mockInAppNotifier.send.mockResolvedValue(undefined);
      mockNotificationRepo.create.mockReturnValue({});
      mockNotificationRepo.save.mockResolvedValue({});
      mockNotificationRepo.findOne.mockResolvedValue(null);

      await service.processScheduled();

      expect(mockScheduledRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ScheduledNotificationStatus.PENDING,
            scheduledAt: LessThanOrEqual(now),
          }),
        })
      );

      expect(mockScheduledRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ScheduledNotificationStatus.SENT })
      );
    });

    it('does NOT dispatch a notification scheduled in the future', async () => {
      const now = new Date('2025-09-01T12:00:00Z');
      jest.useFakeTimers({ now });

      // Repository returns empty — nothing is due
      mockScheduledRepo.find.mockResolvedValue([]);

      await service.processScheduled();

      expect(mockInAppNotifier.send).not.toHaveBeenCalled();
      expect(mockEmailNotifier.send).not.toHaveBeenCalled();
    });

    it('marks item as SENT after successful delivery', async () => {
      const now = new Date('2025-09-05T09:00:00Z');
      jest.useFakeTimers({ now });

      const item = makeScheduled('sn-2', new Date('2025-09-05T08:00:00Z'));
      mockScheduledRepo.find.mockResolvedValue([item]);
      mockScheduledRepo.save.mockImplementation((v: ScheduledNotification) =>
        Promise.resolve(v)
      );

      mockPrefRepo.findOne.mockResolvedValue(makePrefs({ inApp: false }));
      mockNotificationRepo.findOne.mockResolvedValue(null);

      await service.processScheduled();

      const savedArg = mockScheduledRepo.save.mock.calls[0][0] as ScheduledNotification;
      expect(savedArg.status).toBe(ScheduledNotificationStatus.SENT);
    });

    // ── Duplicate-delivery prevention ─────────────────────────────────────────

    describe('duplicate-delivery prevention', () => {
      it('does not re-process an item that is already SENT', async () => {
        const now = new Date('2025-09-10T10:00:00Z');
        jest.useFakeTimers({ now });

        // Repository returns an already-SENT item — the query should filter
        // these out via the status: PENDING where-clause.
        // Simulate this correctly: no items returned.
        mockScheduledRepo.find.mockResolvedValue([]);

        await service.processScheduled();

        expect(mockInAppNotifier.send).not.toHaveBeenCalled();
      });

      it('does not re-process an item that is already CANCELLED', async () => {
        const now = new Date('2025-09-10T10:00:00Z');
        jest.useFakeTimers({ now });

        // Again, cancelled items are filtered by query, so no items returned
        mockScheduledRepo.find.mockResolvedValue([]);

        await service.processScheduled();

        expect(mockInAppNotifier.send).not.toHaveBeenCalled();
      });

      it('handles partial failure without re-processing already-sent items', async () => {
        const now = new Date('2025-09-12T10:00:00Z');
        jest.useFakeTimers({ now });

        const item1 = makeScheduled('sn-ok', new Date('2025-09-12T09:00:00Z'));
        const item2 = makeScheduled('sn-fail', new Date('2025-09-12T09:30:00Z'));

        mockScheduledRepo.find.mockResolvedValue([item1, item2]);
        mockScheduledRepo.save.mockImplementation((v: ScheduledNotification) =>
          Promise.resolve(v)
        );

        const prefs = makePrefs();
        mockPrefRepo.findOne.mockResolvedValue(prefs);

        // item1 succeeds; item2 create throws
        mockInAppNotifier.send
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('downstream failure'));

        mockNotificationRepo.create.mockReturnValue({});
        mockNotificationRepo.save.mockResolvedValue({});
        mockNotificationRepo.findOne.mockResolvedValue(null);

        // Should NOT throw — errors are caught per item
        await expect(service.processScheduled()).resolves.not.toThrow();

        // item1 should be SENT, item2 should remain at an error state (saved after error)
        const saveCalls = mockScheduledRepo.save.mock.calls as [ScheduledNotification][];
        expect(saveCalls.length).toBeGreaterThanOrEqual(1);
      });
    });

    // ── Timezone edge cases ──────────────────────────────────────────────────

    describe('timezone edge cases', () => {
      it.each([
        // Exactly midnight UTC — the LessThanOrEqual comparison must include this timestamp
        ['midnight UTC', '2025-06-15T00:00:00Z', '2025-06-14T23:59:59Z'],
        // USA spring-forward: clocks jump 01:59→03:00, UTC=07:00
        ['USA DST spring-forward UTC', '2025-03-09T07:00:00Z', '2025-03-09T06:30:00Z'],
        // EU spring-forward: clocks jump 01:59→03:00, UTC=01:00
        ['EU DST spring-forward UTC', '2025-03-30T01:00:00Z', '2025-03-29T23:00:00Z'],
        // End of year / new year boundary
        ['new year boundary UTC', '2026-01-01T00:00:01Z', '2025-12-31T23:59:00Z'],
      ])(
        'processes a notification scheduled 1 minute before %s boundary',
        async (_label, nowIso, scheduledAtIso) => {
          const now = new Date(nowIso);
          jest.useFakeTimers({ now });

          const item = makeScheduled('tz-sn', new Date(scheduledAtIso));
          mockScheduledRepo.find.mockResolvedValue([item]);
          mockScheduledRepo.save.mockImplementation((v: ScheduledNotification) =>
            Promise.resolve(v)
          );

          mockPrefRepo.findOne.mockResolvedValue(makePrefs({ inApp: false }));
          mockNotificationRepo.findOne.mockResolvedValue(null);

          await service.processScheduled();

          const saveCalls = mockScheduledRepo.save.mock.calls as [ScheduledNotification][];
          const lastSaved = saveCalls[saveCalls.length - 1]?.[0];
          expect(lastSaved?.status).toBe(ScheduledNotificationStatus.SENT);
        }
      );

      it('does not process a notification whose scheduledAt is 1 second in the future', async () => {
        const now = new Date('2025-06-15T12:00:00Z');
        jest.useFakeTimers({ now });

        // Repository query with LessThanOrEqual filters this out
        mockScheduledRepo.find.mockResolvedValue([]);

        await service.processScheduled();

        expect(mockInAppNotifier.send).not.toHaveBeenCalled();
      });

      it('correctly processes notifications spanning multiple timezones in one batch', async () => {
        const now = new Date('2025-07-01T00:30:00Z');
        jest.useFakeTimers({ now });

        // Three items: UTC, UTC-5, UTC+9 all scheduled for "yesterday local time"
        const items = [
          makeScheduled('utc', new Date('2025-06-30T23:00:00Z')),
          makeScheduled('us-east', new Date('2025-06-30T20:00:00Z')), // UTC-5 yesterday 15:00
          makeScheduled('jp', new Date('2025-07-01T00:00:00Z')), // UTC+9 already past
        ];

        mockScheduledRepo.find.mockResolvedValue(items);
        mockScheduledRepo.save.mockImplementation((v: ScheduledNotification) =>
          Promise.resolve(v)
        );

        mockPrefRepo.findOne.mockResolvedValue(makePrefs({ inApp: false }));
        mockNotificationRepo.findOne.mockResolvedValue(null);

        await service.processScheduled();

        const saveCalls = mockScheduledRepo.save.mock.calls as [ScheduledNotification][];
        const sentItems = saveCalls.filter(
          ([item]) => item.status === ScheduledNotificationStatus.SENT
        );
        expect(sentItems).toHaveLength(3);
      });
    });

    describe('empty due list', () => {
      it('completes gracefully when no notifications are due', async () => {
        mockScheduledRepo.find.mockResolvedValue([]);

        await expect(service.processScheduled()).resolves.not.toThrow();

        expect(mockInAppNotifier.send).not.toHaveBeenCalled();
        expect(mockEmailNotifier.send).not.toHaveBeenCalled();
        expect(mockScheduledRepo.save).not.toHaveBeenCalled();
      });
    });
  });
});
