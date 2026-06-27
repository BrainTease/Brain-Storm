import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { QUEUE_EMAIL, QUEUE_NOTIFICATION } from './queue.constants';
import { EmailWorker } from './email.worker';
import { NotificationWorker } from './notification.worker';
import { QueueSchedulerService } from './queue-scheduler.service';

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 3000 },
  removeOnFail: false, // retain in failed set for DLQ visibility
};

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('redis.url') || 'redis://localhost:6379',
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_EMAIL, defaultJobOptions },
      { name: QUEUE_NOTIFICATION, defaultJobOptions }
    ),
  ],
  providers: [EmailWorker, NotificationWorker, QueueSchedulerService],
  exports: [QueueSchedulerService, BullModule],
})
export class QueueModule {}
