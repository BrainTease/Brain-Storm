import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from '../mail/mail.module';

import { EmailNotifierService } from './email-notifier.service';
import { InAppNotifierService } from './inapp-notifier.service';
import { MobileDevice } from './mobile-device.entity';
import { NotificationPreference } from './notification-preference.entity';
import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsEvents } from './notifications.events';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { PushNotifierService } from './push-notifier.service';
import { ScheduledNotification } from './scheduled-notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
      ScheduledNotification,
      MobileDevice,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
    MailModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsEvents,
    NotificationsGateway,
    PushNotificationService,
    EmailNotifierService,
    PushNotifierService,
    InAppNotifierService,
  ],
  exports: [NotificationsService, PushNotificationService],
})
export class NotificationsModule {}
