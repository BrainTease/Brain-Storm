import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference, NotificationChannel } from './notification-preference.entity';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './notification.entity';
import { MailService } from '../mail/mail.service';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  message: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationRouterService {
  private readonly logger = new Logger(NotificationRouterService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private prefRepo: Repository<NotificationPreference>,
    private notificationsService: NotificationsService,
    private mailService: MailService,
  ) {}

  async route(payload: NotificationPayload): Promise<void> {
    const pref = await this.prefRepo.findOne({ where: { userId: payload.userId } });
    const channels: NotificationChannel[] = pref?.channels ?? [NotificationChannel.IN_APP];

    if (pref && this.isQuietHours(pref)) {
      this.logger.log(`Quiet hours active for user ${payload.userId}, skipping`);
      return;
    }

    const locale = pref?.locale ?? 'en';
    const message = this.localizeMessage(payload.message, locale);

    for (const channel of channels) {
      await this.dispatch(channel, { ...payload, message }, pref ?? null);
    }
  }

  private async dispatch(
    channel: NotificationChannel,
    payload: NotificationPayload,
    pref: NotificationPreference | null,
  ): Promise<void> {
    try {
      switch (channel) {
        case NotificationChannel.IN_APP:
          await this.notificationsService.create(payload.userId, payload.type, payload.message);
          break;

        case NotificationChannel.EMAIL:
          // Delegate to mail service (best-effort)
          await this.mailService.sendNotificationEmail(payload.userId, payload.message);
          break;

        case NotificationChannel.PUSH:
          if (pref?.pushSubscription) {
            this.logger.log(`[PUSH] userId=${payload.userId} msg="${payload.message}"`);
            // VAPID push would be sent here via web-push library
          }
          break;

        case NotificationChannel.WEBHOOK:
          if (pref?.webhookUrl) {
            this.logger.log(`[WEBHOOK] POST ${pref.webhookUrl} userId=${payload.userId}`);
            // HTTP POST to webhook URL would go here
          }
          break;
      }
    } catch (err) {
      this.logger.error(`Failed to dispatch ${channel} for user ${payload.userId}: ${err}`);
    }
  }

  private isQuietHours(pref: NotificationPreference): boolean {
    if (!pref.quietHours) return false;
    const [start, end] = pref.quietHours.split('-');
    const now = new Date();
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const current = now.getUTCHours() * 60 + now.getUTCMinutes();
    const s = toMinutes(start);
    const e = toMinutes(end);
    return s <= e ? current >= s && current < e : current >= s || current < e;
  }

  private localizeMessage(message: string, _locale: string): string {
    // Placeholder: real impl would use i18n/template engine
    return message;
  }

  async upsertPreference(userId: string, data: Partial<NotificationPreference>) {
    const existing = await this.prefRepo.findOne({ where: { userId } });
    const entity = existing ? { ...existing, ...data } : this.prefRepo.create({ userId, ...data });
    return this.prefRepo.save(entity);
  }

  getPreference(userId: string) {
    return this.prefRepo.findOne({ where: { userId } });
  }
}
