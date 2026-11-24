import * as Sentry from '@sentry/nextjs';

import { getConfig } from '@/config';

const appConfig = getConfig();

Sentry.init({
  dsn: appConfig.sentryDsn ?? undefined,
  environment: appConfig.nodeEnv,
  release: appConfig.gitCommitSha ?? 'unknown',
  tracesSampleRate: appConfig.isProduction ? 0.1 : 1.0,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers['authorization'];
      }
    }
    return event;
  },
});
