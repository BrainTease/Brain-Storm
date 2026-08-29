import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MobileDevice } from './mobile-device.entity';

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    @InjectRepository(MobileDevice)
    private deviceRepo: Repository<MobileDevice>
  ) {}

  async registerDevice(userId: string, token: string, platform: string) {
    const existing = await this.deviceRepo.findOne({ where: { userId, pushToken: token } });

    if (existing) {
      existing.lastUsed = new Date();
      return this.deviceRepo.save(existing);
    }

    return this.deviceRepo.save({ userId, pushToken: token, platform });
  }

  async sendPushToUser(userId: string, message: PushMessage) {
    const devices = await this.deviceRepo.find({ where: { userId } });

    await Promise.all(devices.map((device) => this.sendPushToDevice(device.pushToken, message)));
  }

  private async sendPushToDevice(token: string, message: PushMessage) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          title: message.title,
          body: message.body,
          data: message.data,
          sound: 'default',
          priority: 'high',
        }),
      });

      if (!response.ok) {
        this.logger.error(`Push notification failed: ${await response.text()}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error}`);
    }
  }

  async removeDevice(userId: string, token: string) {
    await this.deviceRepo.delete({ userId, pushToken: token });
  }
}
