export interface GdprModuleFailure {
  module: string;
  error: string;
}

/**
 * Raised when a GDPR export/deletion partially fails: some dependent
 * modules succeeded while others failed. Callers should still receive
 * whatever data was collected successfully, alongside a report of what
 * failed, rather than losing the entire request to a single module error.
 */
export class GdprPartialFailureError extends Error {
  constructor(
    public readonly operation: 'export' | 'deletion',
    public readonly userId: string,
    public readonly failures: GdprModuleFailure[],
    public readonly succeededModules: string[],
    public readonly partialData?: Buffer
  ) {
    super(
      `GDPR ${operation} for user ${userId} partially failed in modules: ` +
        failures.map((f) => f.module).join(', ')
    );
    this.name = 'GdprPartialFailureError';
  }
}

/**
 * Raised when every dependent module fails during a GDPR export/deletion,
 * i.e. nothing succeeded at all.
 */
export class GdprTotalFailureError extends Error {
  constructor(
    public readonly operation: 'export' | 'deletion',
    public readonly userId: string,
    public readonly failures: GdprModuleFailure[]
  ) {
    super(`GDPR ${operation} for user ${userId} failed completely`);
    this.name = 'GdprTotalFailureError';
  }
}

/**
 * Runs a set of independent per-module GDPR operations (e.g. export the
 * user's courses, payments, analytics data) and collects failures instead
 * of letting one module's error abort the whole request.
 */
export async function runGdprModules<T>(
  modules: Array<{ name: string; run: () => Promise<T> }>
): Promise<{
  results: Array<{ module: string; data: T }>;
  failures: GdprModuleFailure[];
}> {
  const results: Array<{ module: string; data: T }> = [];
  const failures: GdprModuleFailure[] = [];

  for (const mod of modules) {
    try {
      const data = await mod.run();
      results.push({ module: mod.name, data });
    } catch (error) {
      failures.push({
        module: mod.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { results, failures };
}
