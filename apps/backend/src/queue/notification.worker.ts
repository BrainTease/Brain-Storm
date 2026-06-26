import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NOTIFICATION, JOB_SEND_NOTIFICATION } from './queue.constants';

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
    if (job.name === JOB_SEND_NOTIFICATION) {
      this.logger.log(`Sending notification to user ${job.data.userId} [jobId=${job.id}]`);
      // In production: fanout via WebSocket / push notification service
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Notification job ${job.id} failed: ${err.message}`);
  }
}
