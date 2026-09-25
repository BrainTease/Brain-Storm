import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { JobRunnerService } from '../common/job-runner/job-runner.service';
import { JobExecutionContext, JobResult } from '../common/job-runner/job-runner.interface';
import { BatchService } from './batch.service';
import { BatchJobType } from './batch-job.entity';

interface BatchJobRunnerPayload {
  type: BatchJobType;
  items: Record<string, any>[];
  createdById: string;
}

/**
 * Adapter that registers the `batch` module's job types with the shared
 * JobRunner so batch submissions get the same retry/backoff semantics as
 * every other job in the system instead of a bespoke implementation.
 */
@Injectable()
export class BatchJobRunnerAdapter implements OnModuleInit {
  private readonly logger = new Logger(BatchJobRunnerAdapter.name);

  constructor(
    private readonly jobRunner: JobRunnerService,
    private readonly batchService: BatchService,
  ) {}

  onModuleInit(): void {
    this.jobRunner.registerHandler({
      jobType: 'batch',
      execute: async (
        context: JobExecutionContext<BatchJobRunnerPayload>,
      ): Promise<JobResult> => {
        const { type, items, createdById } = context.payload;

        try {
          const created = await this.dispatch(type, items, createdById);
          return { success: true, output: created };
        } catch (err) {
          this.logger.error(
            `Batch job ${context.jobId} (attempt ${context.attempt}/${context.maxAttempts}) failed`,
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

  /** Submit a batch through the shared JobRunner instead of calling BatchService directly. */
  async submit(
    type: BatchJobType,
    items: Record<string, any>[],
    createdById: string,
  ): Promise<string> {
    return this.jobRunner.enqueue<BatchJobRunnerPayload>('batch', {
      type,
      items,
      createdById,
    });
  }

  private dispatch(
    type: BatchJobType,
    items: Record<string, any>[],
    createdById: string,
  ) {
    switch (type) {
      case 'users':
        return this.batchService.createUserBatch(items, createdById);
      case 'courses':
        return this.batchService.createCourseBatch(items, createdById);
      case 'certificates':
        return this.batchService.createCertificateBatch(items, createdById);
      case 'emails':
        return this.batchService.createEmailBatch(items, createdById);
      case 'export':
        return this.batchService.createExportBatch(items, createdById);
      default:
        throw new Error(`Unsupported batch job type: ${type}`);
    }
  }
}
