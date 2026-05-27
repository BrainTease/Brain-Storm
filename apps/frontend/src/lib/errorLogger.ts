import * as Sentry from '@sentry/nextjs';

interface LogContext {
  source?: string;
  userId?: string;
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export function logError(error: unknown, context: LogContext = {}): void {
  const err = error instanceof Error ? error : new Error(String(error));

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[errorLogger]', context.source ?? 'app', err, context.extra);
  }

  Sentry.captureException(err, {
    tags: { source: context.source ?? 'app', ...context.tags },
    user: context.userId ? { id: context.userId } : undefined,
    extra: context.extra,
  });
}

export function logMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context: LogContext = {},
): void {
  Sentry.captureMessage(message, {
    level,
    tags: { source: context.source ?? 'app', ...context.tags },
    extra: context.extra,
  });
}
