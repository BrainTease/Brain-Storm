import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationRouterService } from './notification-router.service';
import { NotificationPreference, NotificationChannel } from './notification-preference.entity';
import { NotificationsService } from './notifications.service';
import { MailService } from '../mail/mail.service';
import { NotificationType } from './notification.entity';

const mockPrefRepo = () => ({ findOne: jest.fn(), create: jest.fn((d) => d), save: jest.fn((d) => Promise.resolve(d)) });
const mockNotifService = () => ({ create: jest.fn().mockResolvedValue({}) });
const mockMailService = () => ({ sendNotificationEmail: jest.fn().mockResolvedValue(undefined) });

describe('NotificationRouterService', () => {
  let service: NotificationRouterService;
  let prefRepo: ReturnType<typeof mockPrefRepo>;
  let notifService: ReturnType<typeof mockNotifService>;
  let mailService: ReturnType<typeof mockMailService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationRouterService,
        { provide: getRepositoryToken(NotificationPreference), useFactory: mockPrefRepo },
        { provide: NotificationsService, useFactory: mockNotifService },
        { provide: MailService, useFactory: mockMailService },
      ],
    }).compile();
    service = module.get(NotificationRouterService);
    prefRepo = module.get(getRepositoryToken(NotificationPreference));
    notifService = module.get(NotificationsService);
    mailService = module.get(MailService);
  });

  it('routes to in_app by default when no preference exists', async () => {
    prefRepo.findOne.mockResolvedValue(null);
    await service.route({ userId: 'u1', type: NotificationType.ENROLLMENT, message: 'Hello' });
    expect(notifService.create).toHaveBeenCalledWith('u1', NotificationType.ENROLLMENT, 'Hello');
  });

  it('routes to email when email channel enabled', async () => {
    prefRepo.findOne.mockResolvedValue({
      userId: 'u1',
      channels: [NotificationChannel.EMAIL],
      quietHours: null,
      locale: 'en',
    });
    await service.route({ userId: 'u1', type: NotificationType.COMPLETION, message: 'Done' });
    expect(mailService.sendNotificationEmail).toHaveBeenCalledWith('u1', 'Done');
  });

  it('skips dispatch during quiet hours', async () => {
    // Force quiet hours to cover the entire day
    prefRepo.findOne.mockResolvedValue({
      userId: 'u1',
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      quietHours: '00:00-23:59',
      locale: 'en',
    });
    await service.route({ userId: 'u1', type: NotificationType.ENROLLMENT, message: 'Hi' });
    expect(notifService.create).not.toHaveBeenCalled();
    expect(mailService.sendNotificationEmail).not.toHaveBeenCalled();
  });
});
