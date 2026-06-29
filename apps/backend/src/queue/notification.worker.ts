import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NOTIFICATION, JOB_SEND_NOTIFICATION, JOB_TTL_EXTENSION } from './queue.constants';

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

@Processor(QUEUE_NOTIFICATION)
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    switch (job.name) {
      case JOB_SEND_NOTIFICATION:
        this.logger.log(`Sending notification to user ${job.data.userId} [jobId=${job.id}]`);
        // In production: fanout via WebSocket / push notification service
        break;

      case JOB_TTL_EXTENSION:
        this.logger.debug('TTL extension tick');
        break;

      default:
        this.logger.warn(`Unknown notification job: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Notification job ${job.id} (${job.name}) failed: ${err.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Notification job ${job.id} (${job.name}) completed`);
  }
}
