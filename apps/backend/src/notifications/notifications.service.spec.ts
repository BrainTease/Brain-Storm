import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from './notification.entity';
import { NotificationPreference } from './notification-preference.entity';
import { ScheduledNotification, ScheduledNotificationStatus } from './scheduled-notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { MailService } from '../mail/mail.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockNotificationRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
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

  const mockGateway = {
    emitToUser: jest.fn(),
  };

  const mockMailService = {
    sendMail: jest.fn(),
  };

  const makePrefs = (overrides: Partial<NotificationPreference> = {}): NotificationPreference =>
    ({
      id: 'pref-1',
      userId: 'user-1',
      inApp: true,
      email: true,
      push: false,
      enrollment: true,
      completion: true,
      credentialIssued: true,
      coursePublished: true,
      ...overrides,
    } as NotificationPreference);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: mockNotificationRepo },
        { provide: getRepositoryToken(NotificationPreference), useValue: mockPrefRepo },
        { provide: getRepositoryToken(ScheduledNotification), useValue: mockScheduledRepo },
        { provide: NotificationsGateway, useValue: mockGateway },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    // Suppress logger noise
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const userId = 'user-1';
    const type = NotificationType.ENROLLMENT;
    const message = 'You have been enrolled in Rust 101';

    it('saves in-app notification and emits WebSocket event when inApp is true', async () => {
      const prefs = makePrefs({ inApp: true, email: false, push: false });
      mockPrefRepo.findOne.mockResolvedValue(prefs);
      const saved = { id: 'notif-1', userId, type, message } as Notification;
      mockNotificationRepo.create.mockReturnValue(saved);
      mockNotificationRepo.save.mockResolvedValue(saved);
      mockNotificationRepo.findOne.mockResolvedValue(saved);

      await service.create(userId, type, message);

      expect(mockNotificationRepo.create).toHaveBeenCalledWith({ userId, type, message });
      expect(mockNotificationRepo.save).toHaveBeenCalled();
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(userId, 'notification', saved);
    });

    it('does not save in-app notification when inApp pref is false', async () => {
      const prefs = makePrefs({ inApp: false, email: false, push: false });
      mockPrefRepo.findOne.mockResolvedValue(prefs);
      mockNotificationRepo.findOne.mockResolvedValue(null);

      await service.create(userId, type, message);

      expect(mockNotificationRepo.create).not.toHaveBeenCalled();
      expect(mockNotificationRepo.save).not.toHaveBeenCalled();
      expect(mockGateway.emitToUser).not.toHaveBeenCalledWith(userId, 'notification', expect.anything());
    });

    it('sends email notification when email pref is true and emailContext provided', async () => {
      const prefs = makePrefs({ inApp: false, email: true, push: false });
      mockPrefRepo.findOne.mockResolvedValue(prefs);
      mockNotificationRepo.findOne.mockResolvedValue(null);
      mockMailService.sendMail.mockResolvedValue(undefined);

      await service.create(
        userId,
        type,
        message,
        { to: 'student@example.com', context: { courseName: 'Rust 101' } },
      );

      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'student@example.com' }),
      );
    });

    it('does not send email when email pref is false', async () => {
      const prefs = makePrefs({ inApp: false, email: false, push: false });
      mockPrefRepo.findOne.mockResolvedValue(prefs);
      mockNotificationRepo.findOne.mockResolvedValue(null);

      await service.create(
        userId,
        type,
        message,
        { to: 'student@example.com', context: { courseName: 'Rust 101' } },
      );

      expect(mockMailService.sendMail).not.toHaveBeenCalled();
    });

    it('does not send email when emailContext is not provided', async () => {
      const prefs = makePrefs({ inApp: false, email: true, push: false });
      mockPrefRepo.findOne.mockResolvedValue(prefs);
      mockNotificationRepo.findOne.mockResolvedValue(null);

      await service.create(userId, type, message);

      expect(mockMailService.sendMail).not.toHaveBeenCalled();
    });

    it('emits push event when push pref is true', async () => {
      const prefs = makePrefs({ inApp: false, email: false, push: true });
      mockPrefRepo.findOne.mockResolvedValue(prefs);
      mockNotificationRepo.findOne.mockResolvedValue(null);

      await service.create(userId, type, message);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(userId, 'push', { type, message });
    });

    it('creates default prefs when none exist for user', async () => {
      const defaultPrefs = makePrefs();
      mockPrefRepo.findOne.mockResolvedValue(null);
      mockPrefRepo.create.mockReturnValue(defaultPrefs);
      mockPrefRepo.save.mockResolvedValue(defaultPrefs);
      const saved = { id: 'notif-1', userId, type, message } as Notification;
      mockNotificationRepo.create.mockReturnValue(saved);
      mockNotificationRepo.save.mockResolvedValue(saved);
      mockNotificationRepo.findOne.mockResolvedValue(saved);

      await service.create(userId, type, message);

      expect(mockPrefRepo.create).toHaveBeenCalledWith({ userId });
      expect(mockPrefRepo.save).toHaveBeenCalled();
    });

    it('does not send email when notification type is disabled in prefs', async () => {
      const prefs = makePrefs({ email: true, enrollment: false });
      mockPrefRepo.findOne.mockResolvedValue(prefs);
      const saved = { id: 'notif-1', userId, type, message } as Notification;
      mockNotificationRepo.create.mockReturnValue(saved);
      mockNotificationRepo.save.mockResolvedValue(saved);
      mockNotificationRepo.findOne.mockResolvedValue(saved);

      await service.create(
        userId,
        type,
        message,
        { to: 'student@example.com', context: { courseName: 'Rust 101' } },
      );

      expect(mockMailService.sendMail).not.toHaveBeenCalled();
    });

    it('continues gracefully when email send fails', async () => {
      const prefs = makePrefs({ inApp: false, email: true, push: false });
      mockPrefRepo.findOne.mockResolvedValue(prefs);
      mockNotificationRepo.findOne.mockResolvedValue(null);
      mockMailService.sendMail.mockRejectedValue(new Error('SMTP failure'));

      // Should not throw
      await expect(
        service.create(userId, type, message, {
          to: 'student@example.com',
          context: { courseName: 'Rust 101' },
        }),
      ).resolves.not.toThrow();
    });
  });

  // ── findByUser ──────────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('returns notifications for a user ordered correctly', async () => {
      const notifications = [
        { id: 'n1', userId: 'user-1', isRead: false },
        { id: 'n2', userId: 'user-1', isRead: true },
      ] as Notification[];
      mockNotificationRepo.find.mockResolvedValue(notifications);

      const result = await service.findByUser('user-1');

      expect(result).toEqual(notifications);
      expect(mockNotificationRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { isRead: 'ASC', createdAt: 'DESC' },
      });
    });
  });

  // ── markAsRead ──────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('marks a notification as read', async () => {
      const notification = { id: 'n1', userId: 'user-1', isRead: false } as Notification;
      const saved = { ...notification, isRead: true } as Notification;

      mockNotificationRepo.findOne.mockResolvedValue(notification);
      mockNotificationRepo.save.mockResolvedValue(saved);

      const result = await service.markAsRead('n1');

      expect(notification.isRead).toBe(true);
      expect(result).toEqual(saved);
    });

    it('throws NotFoundException when notification not found', async () => {
      mockNotificationRepo.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── markAllAsRead ───────────────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('bulk-updates all unread notifications for a user', async () => {
      mockNotificationRepo.update.mockResolvedValue({ affected: 3 });

      const result = await service.markAllAsRead('user-1');

      expect(mockNotificationRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRead: false },
        { isRead: true },
      );
      expect(result).toEqual({ success: true });
    });
  });
});
