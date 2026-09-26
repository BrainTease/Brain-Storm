/**
 * Shared job-runner abstraction sitting on top of the `queue` module.
 *
 * Both `batch` and `jobs` previously implemented their own
 * scheduling/execution/retry logic. This interface unifies that surface so
 * new job types only need to implement `JobHandler` and register with the
 * `JobRunner` rather than re-inventing retry/backoff semantics.
 */

export interface JobExecutionContext<TPayload = unknown> {
  jobId: string;
  jobType: string;
  payload: TPayload;
  attempt: number;
  maxAttempts: number;
  enqueuedAt: Date;
}

export interface JobResult<TOutput = unknown> {
  success: boolean;
  output?: TOutput;
  error?: string;
  shouldRetry?: boolean;
}

export interface JobHandler<TPayload = unknown, TOutput = unknown> {
  readonly jobType: string;
  execute(context: JobExecutionContext<TPayload>): Promise<JobResult<TOutput>>;
}

export interface JobRunnerOptions {
  maxAttempts?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
  timeoutMs?: number;
}

export interface EnqueueOptions extends JobRunnerOptions {
  delayMs?: number;
  priority?: number;
}

export interface JobRunStats {
  jobId: string;
  jobType: string;
  attempts: number;
  status: 'succeeded' | 'failed' | 'retrying';
  lastError?: string;
}

/**
 * Common contract that both `batch` and `jobs` modules should depend on
 * instead of talking to the queue module directly.
 */
export interface JobRunner {
  registerHandler<TPayload, TOutput>(handler: JobHandler<TPayload, TOutput>): void;

  enqueue<TPayload>(
    jobType: string,
    payload: TPayload,
    options?: EnqueueOptions,
  ): Promise<string>;

  run<TPayload, TOutput>(
    jobType: string,
    payload: TPayload,
    options?: JobRunnerOptions,
  ): Promise<JobResult<TOutput>>;

  getStats(jobId: string): JobRunStats | undefined;
}
