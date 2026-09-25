import { JobRunnerService } from './job-runner.service';
import { JobHandler, JobExecutionContext, JobResult } from './job-runner.interface';

describe('JobRunnerService', () => {
  let runner: JobRunnerService;

  beforeEach(() => {
    runner = new JobRunnerService();
  });

  it('executes a handler successfully on the first attempt', async () => {
    const handler: JobHandler<{ n: number }, number> = {
      jobType: 'add-one',
      execute: jest.fn(
        async (ctx: JobExecutionContext<{ n: number }>): Promise<JobResult<number>> => ({
          success: true,
          output: ctx.payload.n + 1,
        }),
      ),
    };

    runner.registerHandler(handler);
    const result = await runner.run('add-one', { n: 1 });

    expect(result.success).toBe(true);
    expect(result.output).toBe(2);
    expect(handler.execute).toHaveBeenCalledTimes(1);
  });

  it('retries on failure until maxAttempts is reached', async () => {
    let calls = 0;
    const handler: JobHandler<undefined, undefined> = {
      jobType: 'always-fails',
      execute: jest.fn(async () => {
        calls += 1;
        return { success: false, error: 'boom', shouldRetry: true };
      }),
    };

    runner.registerHandler(handler);
    const result = await runner.run('always-fails', undefined, {
      maxAttempts: 3,
      backoffMs: 1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
    expect(calls).toBe(3);
  });

  it('succeeds after a transient failure within the retry budget', async () => {
    let attempts = 0;
    const handler: JobHandler<undefined, string> = {
      jobType: 'flaky',
      execute: jest.fn(async () => {
        attempts += 1;
        if (attempts < 2) {
          return { success: false, error: 'transient', shouldRetry: true };
        }
        return { success: true, output: 'ok' };
      }),
    };

    runner.registerHandler(handler);
    const result = await runner.run('flaky', undefined, {
      maxAttempts: 5,
      backoffMs: 1,
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('does not retry when shouldRetry is explicitly false', async () => {
    const handler: JobHandler<undefined, undefined> = {
      jobType: 'fatal-error',
      execute: jest.fn(async () => ({
        success: false,
        error: 'unrecoverable',
        shouldRetry: false,
      })),
    };

    runner.registerHandler(handler);
    const result = await runner.run('fatal-error', undefined, {
      maxAttempts: 5,
      backoffMs: 1,
    });

    expect(result.success).toBe(false);
    expect(handler.execute).toHaveBeenCalledTimes(1);
  });

  it('catches thrown errors from handlers and treats them as retryable failures', async () => {
    let attempts = 0;
    const handler: JobHandler<undefined, undefined> = {
      jobType: 'throws',
      execute: jest.fn(async () => {
        attempts += 1;
        throw new Error('exploded');
      }),
    };

    runner.registerHandler(handler);
    const result = await runner.run('throws', undefined, {
      maxAttempts: 2,
      backoffMs: 1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('exploded');
    expect(attempts).toBe(2);
  });

  it('returns a failure result when no handler is registered', async () => {
    const result = await runner.run('unknown-type', undefined);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No JobHandler registered/);
  });

  it('tracks stats for the most recent run of a job', async () => {
    const handler: JobHandler<undefined, undefined> = {
      jobType: 'stats-job',
      execute: jest.fn(async () => ({ success: true })),
    };

    runner.registerHandler(handler);
    await runner.run('stats-job', undefined);

    const allStats = Array.from((runner as any).stats.values());
    expect(allStats.length).toBeGreaterThan(0);
    expect(allStats[0].status).toBe('succeeded');
  });
});
