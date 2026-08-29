import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from './notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class PushNotifierService {
  private readonly logger = new Logger(PushNotifierService.name);

  constructor(private readonly gateway: NotificationsGateway) {}

  async send(userId: string, type: NotificationType, message: string): Promise<void> {
    try {
      this.gateway.emitToUser(userId, 'push', { type, message });
    } catch (err: any) {
      this.logger.error(`Push notification failed: ${err.message}`);
      throw err;
    }
  }
}
