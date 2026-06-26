import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_EMAIL,
  QUEUE_NOTIFICATION,
  JOB_CLEANUP_EXPIRED,
  JOB_TTL_EXTENSION,
} from './queue.constants';

@Injectable()
export class QueueSchedulerService {
  private readonly logger = new Logger(QueueSchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATION) private readonly notificationQueue: Queue
  ) {}

  /** Runs daily at midnight — clean up expired/stale data. */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduleCleanup() {
    await this.emailQueue.add(
      JOB_CLEANUP_EXPIRED,
      {},
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );
    this.logger.log('Scheduled cleanup job enqueued');
  }

  /** Runs every hour — extend TTLs for active sessions/caches. */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduleTtlExtension() {
    await this.notificationQueue.add(
      JOB_TTL_EXTENSION,
      {},
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
    );
    this.logger.log('Scheduled TTL-extension job enqueued');
  }

  /** Enqueue an email asynchronously with retry/backoff. */
  async enqueueEmail(data: { to: string; subject: string; body: string; html?: string }) {
    return this.emailQueue.add('send-email', data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: false, // keep failed jobs visible in DLQ
    });
  }

  /** Enqueue a notification fan-out job. */
  async enqueueNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
  }) {
    return this.notificationQueue.add('send-notification', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: false,
    });
  }

  /** Return failed (DLQ) jobs for both queues. */
  async getFailedJobs(queueName: 'email' | 'notification') {
    const queue = queueName === 'email' ? this.emailQueue : this.notificationQueue;
    return queue.getFailed(0, 99);
  }
}
