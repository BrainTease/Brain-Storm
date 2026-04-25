import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJob } from './batch-job.entity';
import { UsersService } from '../users/users.service';
import { CoursesService } from '../courses/courses.service';

@Injectable()
export class BatchService {
  constructor(
    @InjectRepository(BatchJob) private jobRepo: Repository<BatchJob>,
    private usersService: UsersService,
    private coursesService: CoursesService,
  ) {}

  async createUserBatch(payload: Record<string, any>[], createdById: string): Promise<BatchJob> {
    const job = await this.jobRepo.save(
      this.jobRepo.create({ type: 'users', payload, totalItems: payload.length, createdById }),
    );
    // Process asynchronously
    setImmediate(() => this.processUserBatch(job.id));
    return job;
  }

  async createCourseBatch(payload: Record<string, any>[], createdById: string): Promise<BatchJob> {
    const job = await this.jobRepo.save(
      this.jobRepo.create({ type: 'courses', payload, totalItems: payload.length, createdById }),
    );
    setImmediate(() => this.processCourseBatch(job.id));
    return job;
  }

  async getJobStatus(jobId: string): Promise<BatchJob> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Batch job not found');
    return job;
  }

  async listJobs(type?: string): Promise<BatchJob[]> {
    const where = type ? { type: type as any } : {};
    return this.jobRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
  }

  private async processUserBatch(jobId: string): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return;

    await this.jobRepo.update(jobId, { status: 'processing' });

    const results: Record<string, any>[] = [];
    const errors: Record<string, any>[] = [];

    for (const item of job.payload) {
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
      status: errors.length === job.totalItems ? 'failed' : 'completed',
      results,
      errors,
      processedItems: results.length,
      failedItems: errors.length,
    });
  }

  private async processCourseBatch(jobId: string): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return;

    await this.jobRepo.update(jobId, { status: 'processing' });

    const results: Record<string, any>[] = [];
    const errors: Record<string, any>[] = [];

    for (const item of job.payload) {
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
      status: errors.length === job.totalItems ? 'failed' : 'completed',
      results,
      errors,
      processedItems: results.length,
      failedItems: errors.length,
    });
  }
}
