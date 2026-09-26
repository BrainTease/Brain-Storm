import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobRunnerService } from '../common/job-runner/job-runner.service';
import { JobResult } from '../common/job-runner/job-runner.interface';
import { JobsService } from './jobs.service';

/**
 * Registers the `jobs` module's scheduled maintenance task with the shared
 * JobRunner so it benefits from the same retry/failure handling as `batch`,
 * instead of the `@Cron` handler swallowing errors on its own.
 */
@Injectable()
export class JobsJobRunnerAdapter implements OnModuleInit {
  private readonly logger = new Logger(JobsJobRunnerAdapter.name);

  constructor(
    private readonly jobRunner: JobRunnerService,
    private readonly jobsService: JobsService,
  ) {}

  onModuleInit(): void {
    this.jobRunner.registerHandler({
      jobType: 'jobs-expire-old',
      execute: async (): Promise<JobResult> => {
        try {
          await this.jobsService.expireOldJobs();
          return { success: true };
        } catch (err) {
          this.logger.error(
            'Failed to expire old job postings',
            err instanceof Error ? err.stack : String(err),
          );
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
            shouldRetry: true,
          };
        }
      },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async runScheduledExpiry(): Promise<void> {
    const result = await this.jobRunner.run('jobs-expire-old', undefined, {
      maxAttempts: 3,
      backoffMs: 2000,
    });

    if (!result.success) {
      this.logger.error(
        `jobs-expire-old exhausted retries: ${result.error}`,
      );
    }
  }
}
