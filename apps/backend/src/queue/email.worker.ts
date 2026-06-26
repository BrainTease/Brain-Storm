import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_EMAIL, JOB_SEND_EMAIL } from './queue.constants';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

@Processor(QUEUE_EMAIL)
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  async process(job: Job<EmailJobData>): Promise<void> {
    if (job.name === JOB_SEND_EMAIL) {
      this.logger.log(`Sending email to ${job.data.to} [jobId=${job.id}]`);
      // Delegate to real mail transport in production; stub here.
      // import { MailService } from '../mail/mail.service';
      // await this.mailService.send(job.data);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Email job ${job.id} failed: ${err.message}`);
  }
}
