import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_EMAIL, JOB_SEND_EMAIL, JOB_CLEANUP_EXPIRED } from './queue.constants';
import { EmailService } from '../email/email.service';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

@Processor(QUEUE_EMAIL)
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  constructor(@Inject(EmailService) private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    switch (job.name) {
      case JOB_SEND_EMAIL:
        this.logger.log(`Sending email to ${job.data.to} [jobId=${job.id}]`);
        await this.emailService.enqueue(job.data.to, job.data.subject, job.data.html);
        break;

      case JOB_CLEANUP_EXPIRED:
        this.logger.log('Running scheduled cleanup of expired email queue entries');
        // Trigger the email queue's own cleanup via processQueue
        await this.emailService.processQueue();
        break;

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Email job ${job.id} (${job.name}) failed: ${err.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Email job ${job.id} (${job.name}) completed`);
  }
}
