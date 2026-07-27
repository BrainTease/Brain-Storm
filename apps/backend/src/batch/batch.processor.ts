import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJob } from './batch-job.entity';
import { UsersService } from '../users/users.service';
import { CoursesService } from '../courses/courses.service';
import { CertificatesService } from '../certificates/certificates.service';
import { MailService } from '../mail/mail.service';

@Injectable()
@Processor('batch')
export class BatchProcessor {
  private readonly logger = new Logger(BatchProcessor.name);

  constructor(
    @InjectRepository(BatchJob)
    private readonly jobRepo: Repository<BatchJob>,
    private readonly usersService: UsersService,
    private readonly coursesService: CoursesService,
    private readonly certificatesService: CertificatesService,
    private readonly mailService: MailService,
  ) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.data.type}`);
    this.jobRepo.update(job.data.jobId, { status: 'processing' });
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Completed job ${job.id}`);
    // The actual update will be done in the processor method
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Failed job ${job.id}: ${error.message}`);
    this.jobRepo.update(job.data.jobId, {
      status: 'failed',
      errors: [{ error: error.message, timestamp: new Date() }],
    });
  }

  @Process('users')
  async processUserBatch(job: Job) {
    const { jobId, payload } = job.data;
    this.logger.log(`Processing user batch job ${jobId} with ${payload.length} items`);

    const results: Record<string, any>[] = [];
    const errors: Record<string, any>[] = [];

    for (const item of payload) {
      try {
        const { action, userId, ...data } = item;
        let result: any;

        if (action === 'update' && userId) {
          result = await this.usersService.update(userId, data);
        } else if (action === 'ban' && userId) {
          result = await this.usersService.banUser(userId, true);
        } else if (action === 'unban' && userId) {
          result = await this.usersService.banUser(userId, false);
        } else if (action === 'changeRole' && userId) {
          result = await this.usersService.changeRole(userId, data.role);
        } else if (action === 'delete' && userId) {
          result = await this.usersService.softDelete(userId);
        } else {
          throw new Error(`Unknown action: ${action}`);
        }

        results.push({ userId, action, success: true, result: { id: result.id } });
      } catch (err: any) {
        errors.push({ item, error: err.message });
      }
    }

    await this.jobRepo.update(jobId, {
      status: errors.length === job.data.totalItems ? 'failed' : 'completed',
      results,
      errors,
      processedItems: results.length,
      failedItems: errors.length,
    });
  }

  @Process('courses')
  async processCourseBatch(job: Job) {
    const { jobId, payload } = job.data;
    this.logger.log(`Processing course batch job ${jobId} with ${payload.length} items`);

    const results: Record<string, any>[] = [];
    const errors: Record<string, any>[] = [];

    for (const item of payload) {
      try {
        const { action, courseId, ...data } = item;
        let result: any;

        if (action === 'update' && courseId) {
          result = await this.coursesService.update(courseId, data);
        } else if (action === 'delete' && courseId) {
          result = await this.coursesService.delete(courseId);
        } else if (action === 'create') {
          result = await this.coursesService.create(data);
        } else {
          throw new Error(`Unknown action: ${action}`);
        }

        results.push({ courseId: result.id, action, success: true });
      } catch (err: any) {
        errors.push({ item, error: err.message });
      }
    }

    await this.jobRepo.update(jobId, {
      status: errors.length === job.data.totalItems ? 'failed' : 'completed',
      results,
      errors,
      processedItems: results.length,
      failedItems: errors.length,
    });
  }

  @Process('certificates')
  async processCertificateBatch(job: Job) {
    const { jobId, payload } = job.data;
    this.logger.log(`Processing certificate batch job ${jobId} with ${payload.length} items`);

    const results: Record<string, any>[] = [];
    const errors: Record<string, any>[] = [];

    for (const item of payload) {
      try {
        const { action, userId, courseId, ...data } = item;
        let result: any;

        if (action === 'issue' && userId && courseId) {
          result = await this.certificatesService.issueCertificate(userId, courseId, data);
        } else if (action === 'revoke' && userId && courseId) {
          result = await this.certificatesService.revokeCertificate(userId, courseId);
        } else {
          throw new Error(`Unknown action: ${action}`);
        }

        results.push({ userId, courseId, action, success: true, result });
      } catch (err: any) {
        errors.push({ item, error: err.message });
      }
    }

    await this.jobRepo.update(jobId, {
      status: errors.length === job.data.totalItems ? 'failed' : 'completed',
      results,
      errors,
      processedItems: results.length,
      failedItems: errors.length,
    });
  }

  @Process('emails')
  async processEmailBatch(job: Job) {
    const { jobId, payload } = job.data;
    this.logger.log(`Processing email batch job ${jobId} with ${payload.length} items`);

    const results: Record<string, any>[] = [];
    const errors: Record<string, any>[] = [];

    for (const item of payload) {
      try {
        const { to, subject, template, context } = item;
        const result = await this.mailService.sendMail({
          to,
          subject,
          template,
          context,
        });

        results.push({ to, subject, success: true, result });
      } catch (err: any) {
        errors.push({ item, error: err.message });
      }
    }

    await this.jobRepo.update(jobId, {
      status: errors.length === job.data.totalItems ? 'failed' : 'completed',
      results,
      errors,
      processedItems: results.length,
      failedItems: errors.length,
    });
  }

  @Process('export')
  async processExportBatch(job: Job) {
    const { jobId, payload } = job.data;
    this.logger.log(`Processing export batch job ${jobId}`);

    // For simplicity, we'll treat the payload as a single export request
    const [exportRequest] = payload;
    const { exportType, filters, format } = exportRequest;

    try {
      let result: any;
      if (exportType === 'users') {
        result = await this.usersService.exportUsers(filters, format);
      } else if (exportType === 'courses') {
        result = await this.coursesService.exportCourses(filters, format);
      } else if (exportType === 'analytics') {
        result = await this.analyticsService.exportAnalytics(filters, format);
      } else {
        throw new Error(`Unknown export type: ${exportType}`);
      }

      await this.jobRepo.update(jobId, {
        status: 'completed',
        results: [{ success: true, result }],
        processedItems: 1,
      });
    } catch (err: any) {
      await this.jobRepo.update(jobId, {
        status: 'failed',
        errors: [{ error: err.message }],
        processedItems: 0,
        failedItems: 1,
      });
    }
  }
}