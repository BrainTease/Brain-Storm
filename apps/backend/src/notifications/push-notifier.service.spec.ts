import { Test, TestingModule } from '@nestjs/testing';
import { PushNotifierService } from './push-notifier.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType } from './notification.entity';

describe('PushNotifierService', () => {
  let service: PushNotifierService;
  let gateway: { emitToUser: jest.Mock };

  beforeEach(async () => {
    gateway = { emitToUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotifierService,
        { provide: NotificationsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<PushNotifierService>(PushNotifierService);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('has channel set to "push"', () => {
    expect(service.channel).toBe('push');
  });

  describe('send', () => {
    const userId = 'user-1';
    const type = NotificationType.ENROLLMENT;
    const message = 'You have been enrolled in Rust 101';

    it('calls gateway.emitToUser with the push event, type, and message', async () => {
      await service.send(userId, type, message);

      expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
      expect(gateway.emitToUser).toHaveBeenCalledWith(userId, 'push', { type, message });
    });

    it('passes the correct userId to emitToUser', async () => {
      await service.send('user-42', type, message);

      expect(gateway.emitToUser).toHaveBeenCalledWith('user-42', 'push', expect.any(Object));
    });

    it('passes the correct type and message in the payload', async () => {
      await service.send(userId, NotificationType.COMPLETION, 'Course done');

      expect(gateway.emitToUser).toHaveBeenCalledWith(userId, 'push', {
        type: NotificationType.COMPLETION,
        message: 'Course done',
      });
    });

    it('throws and logs when emitToUser throws', async () => {
      const err = new Error('WebSocket error');
      gateway.emitToUser.mockImplementation(() => {
        throw err;
      });

      await expect(service.send(userId, type, message)).rejects.toThrow('WebSocket error');
    });
  });
});
