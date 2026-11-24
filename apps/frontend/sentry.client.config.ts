import * as Sentry from '@sentry/nextjs';

import { getConfig } from '@/config';

const appConfig = getConfig();

Sentry.init({
  dsn: appConfig.sentryDsn ?? undefined,
  environment: appConfig.nodeEnv,
  release: appConfig.gitCommitSha ?? 'unknown',
  tracesSampleRate: appConfig.isProduction ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
    }
    return event;
  },
});
