import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InAppNotifierService } from './inapp-notifier.service';
import { Notification, NotificationType } from './notification.entity';
import { NotificationsGateway } from './notifications.gateway';

describe('InAppNotifierService', () => {
  let service: InAppNotifierService;
  let repo: { create: jest.Mock; save: jest.Mock };
  let gateway: { emitToUser: jest.Mock };

  beforeEach(async () => {
    repo = { create: jest.fn(), save: jest.fn() };
    gateway = { emitToUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotifierService,
        { provide: getRepositoryToken(Notification), useValue: repo },
        { provide: NotificationsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<InAppNotifierService>(InAppNotifierService);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('has channel set to "inapp"', () => {
    expect(service.channel).toBe('inapp');
  });

  describe('send', () => {
    const userId = 'user-1';
    const type = NotificationType.ENROLLMENT;
    const message = 'You have been enrolled in Rust 101';

    const makeNotification = (overrides: Partial<Notification> = {}): Notification =>
      ({
        id: 'notif-1',
        userId,
        type,
        message,
        isRead: false,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        ...overrides,
      }) as Notification;

    it('calls repo.create with userId, type, and message', async () => {
      const notification = makeNotification();
      repo.create.mockReturnValue(notification);
      repo.save.mockResolvedValue(notification);

      await service.send(userId, type, message);

      expect(repo.create).toHaveBeenCalledWith({ userId, type, message });
    });

    it('persists the notification via repo.save', async () => {
      const notification = makeNotification();
      repo.create.mockReturnValue(notification);
      repo.save.mockResolvedValue(notification);

      await service.send(userId, type, message);

      expect(repo.save).toHaveBeenCalledWith(notification);
    });

    it('emits the saved notification to the user via gateway', async () => {
      const notification = makeNotification();
      const saved = makeNotification({ id: 'notif-saved' });
      repo.create.mockReturnValue(notification);
      repo.save.mockResolvedValue(saved);

      await service.send(userId, type, message);

      expect(gateway.emitToUser).toHaveBeenCalledWith(userId, 'notification', saved);
    });

    it('returns the saved notification', async () => {
      const saved = makeNotification({ id: 'notif-returned' });
      repo.create.mockReturnValue(saved);
      repo.save.mockResolvedValue(saved);

      const result = await service.send(userId, type, message);

      expect(result).toEqual(saved);
    });

    it('throws and logs when repo.save rejects', async () => {
      const err = new Error('DB write failed');
      repo.create.mockReturnValue(makeNotification());
      repo.save.mockRejectedValue(err);

      await expect(service.send(userId, type, message)).rejects.toThrow('DB write failed');

      expect(gateway.emitToUser).not.toHaveBeenCalled();
    });

    it('throws and logs when gateway.emitToUser throws', async () => {
      const notification = makeNotification();
      repo.create.mockReturnValue(notification);
      repo.save.mockResolvedValue(notification);
      gateway.emitToUser.mockImplementation(() => {
        throw new Error('Socket error');
      });

      await expect(service.send(userId, type, message)).rejects.toThrow('Socket error');
    });
  });
});
