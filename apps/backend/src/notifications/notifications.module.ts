import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Notification } from './notification.entity';
import { NotificationPreference } from './notification-preference.entity';
import { ScheduledNotification } from './scheduled-notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsEvents } from './notifications.events';
import { NotificationsGateway } from './notifications.gateway';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference, ScheduledNotification]),
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
  providers: [NotificationsService, NotificationsEvents, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
