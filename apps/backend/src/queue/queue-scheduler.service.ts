import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_EMAIL,
  QUEUE_NOTIFICATION,
  QUEUE_CERTIFICATE,
  QUEUE_INDEXING,
  JOB_SEND_EMAIL,
  JOB_SEND_NOTIFICATION,
  JOB_CLEANUP_EXPIRED,
  JOB_TTL_EXTENSION,
  JOB_ISSUE_CERTIFICATE,
  JOB_MINT_CREDENTIAL,
  JOB_INDEX_COURSE,
  JOB_INDEX_LESSON,
  JOB_INDEX_POST,
  JOB_DELETE_FROM_INDEX,
} from './queue.constants';
import type {
  EmailJobData,
  IssueCertificateJobData,
  MintCredentialJobData,
  IndexCourseJobData,
  IndexLessonJobData,
  IndexPostJobData,
  DeleteFromIndexJobData,
} from './types';
import type { IndexName } from '../search/search.service';

@Injectable()
export class QueueSchedulerService {
  private readonly logger = new Logger(QueueSchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATION) private readonly notificationQueue: Queue,
    @InjectQueue(QUEUE_CERTIFICATE) private readonly certificateQueue: Queue,
    @InjectQueue(QUEUE_INDEXING) private readonly indexingQueue: Queue,
  ) {}

  // ─── Cron jobs ──────────────────────────────────────────────────────────────

  /** Daily midnight — clean up expired email queue entries */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduleCleanup() {
    await this.emailQueue.add(JOB_CLEANUP_EXPIRED, {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    this.logger.log('Scheduled cleanup job enqueued');
  }

  /** Every hour — extend TTLs for active sessions/caches */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduleTtlExtension() {
    await this.notificationQueue.add(JOB_TTL_EXTENSION, {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    this.logger.log('Scheduled TTL-extension job enqueued');
  }

  // ─── Email ───────────────────────────────────────────────────────────────────

  async enqueueEmail(data: EmailJobData) {
    return this.emailQueue.add(JOB_SEND_EMAIL, data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
    });
  }

  // ─── Notifications ────────────────────────────────────────────────────────────

  async enqueueNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
  }) {
    return this.notificationQueue.add(JOB_SEND_NOTIFICATION, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  // ─── Certificates ─────────────────────────────────────────────────────────────

  async enqueueIssueCertificate(data: IssueCertificateJobData) {
    return this.certificateQueue.add(JOB_ISSUE_CERTIFICATE, data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async enqueueMintCredential(data: MintCredentialJobData) {
    return this.certificateQueue.add(JOB_MINT_CREDENTIAL, data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 10000 },
      // Stellar on-chain ops benefit from longer delays between retries
    });
  }

  // ─── Indexing ─────────────────────────────────────────────────────────────────

  async enqueueIndexCourse(data: IndexCourseJobData) {
    return this.indexingQueue.add(JOB_INDEX_COURSE, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  async enqueueIndexLesson(data: IndexLessonJobData) {
    return this.indexingQueue.add(JOB_INDEX_LESSON, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  async enqueueIndexPost(data: IndexPostJobData) {
    return this.indexingQueue.add(JOB_INDEX_POST, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  async enqueueDeleteFromIndex(index: IndexName, id: string) {
    return this.indexingQueue.add(
      JOB_DELETE_FROM_INDEX,
      { index, id } as DeleteFromIndexJobData,
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  // ─── DLQ inspection ──────────────────────────────────────────────────────────

  async getFailedJobs(queueName: 'email' | 'notification' | 'certificate' | 'indexing') {
    const queueMap: Record<string, Queue> = {
      email: this.emailQueue,
      notification: this.notificationQueue,
      certificate: this.certificateQueue,
      indexing: this.indexingQueue,
    };
    const queue = queueMap[queueName];
    if (!queue) return [];
    return queue.getFailed(0, 99);
  }

  /** Retry all failed jobs in a given queue */
  async retryFailedJobs(queueName: 'email' | 'notification' | 'certificate' | 'indexing') {
    const failed = await this.getFailedJobs(queueName);
    await Promise.all(failed.map((job) => job.retry()));
    this.logger.log(`Retried ${failed.length} failed jobs in queue: ${queueName}`);
    return { retried: failed.length };
  }

  /** Get queue depths for Prometheus / health dashboards */
  async getQueueStats() {
    const [email, notification, certificate, indexing] = await Promise.all([
      this.emailQueue.getJobCounts(),
      this.notificationQueue.getJobCounts(),
      this.certificateQueue.getJobCounts(),
      this.indexingQueue.getJobCounts(),
    ]);
    return { email, notification, certificate, indexing };
  }
}
