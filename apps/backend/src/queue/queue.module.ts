import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import {
  QUEUE_EMAIL,
  QUEUE_NOTIFICATION,
  QUEUE_CERTIFICATE,
  QUEUE_INDEXING,
} from './queue.constants';
import { EmailWorker } from './email.worker';
import { NotificationWorker } from './notification.worker';
import { CertificateWorker } from './certificate.worker';
import { IndexingWorker } from './indexing.worker';
import { QueueSchedulerService } from './queue-scheduler.service';
import { QueueMetricsService } from './queue-metrics.service';
import { EmailModule } from '../email/email.module';
import { SearchModule } from '../search/search.module';

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 3000 },
  removeOnFail: false, // retain in failed set for DLQ visibility
  removeOnComplete: { count: 500 }, // keep last 500 completed jobs
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
        defaultJobOptions,
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_EMAIL },
      { name: QUEUE_NOTIFICATION },
      { name: QUEUE_CERTIFICATE },
      { name: QUEUE_INDEXING },
    ),
    EmailModule,
    SearchModule,
  ],
  providers: [
    EmailWorker,
    NotificationWorker,
    CertificateWorker,
    IndexingWorker,
    QueueSchedulerService,
    QueueMetricsService,
  ],
  exports: [QueueSchedulerService, QueueMetricsService, BullModule],
})
export class QueueModule {}
