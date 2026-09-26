import { Injectable, Logger } from '@nestjs/common';
import {
  EnqueueOptions,
  JobExecutionContext,
  JobHandler,
  JobResult,
  JobRunner,
  JobRunStats,
  JobRunnerOptions,
} from './job-runner.interface';

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 500;
const DEFAULT_BACKOFF_MULTIPLIER = 2;

/**
 * Single shared implementation of the JobRunner abstraction on top of the
 * queue module. `batch` and `jobs` both register handlers here instead of
 * each maintaining their own retry/backoff loop.
 */
@Injectable()
export class JobRunnerService implements JobRunner {
  private readonly logger = new Logger(JobRunnerService.name);
  private readonly handlers = new Map<string, JobHandler>();
  private readonly stats = new Map<string, JobRunStats>();

  registerHandler<TPayload, TOutput>(
    handler: JobHandler<TPayload, TOutput>,
  ): void {
    if (this.handlers.has(handler.jobType)) {
      this.logger.warn(
        `Overwriting existing handler for job type "${handler.jobType}"`,
      );
    }
    this.handlers.set(handler.jobType, handler as JobHandler);
  }

  async enqueue<TPayload>(
    jobType: string,
    payload: TPayload,
    options?: EnqueueOptions,
  ): Promise<string> {
    const jobId = this.generateJobId(jobType);
    const delay = options?.delayMs ?? 0;

    if (delay > 0) {
      setTimeout(() => {
        void this.run(jobType, payload, options);
      }, delay);
    } else {
      void this.run(jobType, payload, options);
    }

    return jobId;
  }

  async run<TPayload, TOutput>(
    jobType: string,
    payload: TPayload,
    options?: JobRunnerOptions,
  ): Promise<JobResult<TOutput>> {
    const handler = this.handlers.get(jobType) as
      | JobHandler<TPayload, TOutput>
      | undefined;

    if (!handler) {
      const error = `No JobHandler registered for job type "${jobType}"`;
      this.logger.error(error);
      return { success: false, error };
    }

    const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const baseBackoff = options?.backoffMs ?? DEFAULT_BACKOFF_MS;
    const multiplier = options?.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER;
    const jobId = this.generateJobId(jobType);

    let attempt = 0;
    let lastResult: JobResult<TOutput> | undefined;

    while (attempt < maxAttempts) {
      attempt += 1;

      const context: JobExecutionContext<TPayload> = {
        jobId,
        jobType,
        payload,
        attempt,
        maxAttempts,
        enqueuedAt: new Date(),
      };

      this.recordStats(jobId, jobType, attempt, 'retrying');

      try {
        lastResult = await handler.execute(context);
      } catch (err) {
        lastResult = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          shouldRetry: true,
        };
      }

      if (lastResult.success) {
        this.recordStats(jobId, jobType, attempt, 'succeeded');
        return lastResult;
      }

      const canRetry =
        lastResult.shouldRetry !== false && attempt < maxAttempts;

      if (!canRetry) {
        this.recordStats(
          jobId,
          jobType,
          attempt,
          'failed',
          lastResult.error,
        );
        return lastResult;
      }

      const backoff = baseBackoff * Math.pow(multiplier, attempt - 1);
      this.logger.warn(
        `Job "${jobType}" (${jobId}) attempt ${attempt} failed, retrying in ${backoff}ms: ${lastResult.error}`,
      );
      await this.sleep(backoff);
    }

    return (
      lastResult ?? {
        success: false,
        error: 'Job exhausted retries without executing',
      }
    );
  }

  getStats(jobId: string): JobRunStats | undefined {
    return this.stats.get(jobId);
  }

  private recordStats(
    jobId: string,
    jobType: string,
    attempts: number,
    status: JobRunStats['status'],
    lastError?: string,
  ): void {
    this.stats.set(jobId, { jobId, jobType, attempts, status, lastError });
  }

  private generateJobId(jobType: string): string {
    return `${jobType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
