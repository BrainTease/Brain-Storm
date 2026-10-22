import type { NotificationChannel } from './notification-channel.interface';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class InAppNotifierService implements NotificationChannel {
  readonly channel = 'inapp' as const;

  private readonly logger = new Logger(InAppNotifierService.name);

  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
    private readonly gateway: NotificationsGateway
  ) {}

  async send(userId: string, type: NotificationType, message: string): Promise<Notification> {
    try {
      const notification = this.repo.create({ userId, type, message });
      const saved = await this.repo.save(notification);
      this.gateway.emitToUser(userId, 'notification', saved);
      return saved;
    } catch (err: any) {
      this.logger.error(`In-app notification failed: ${err.message}`);
      throw err;
    }
  }
}
