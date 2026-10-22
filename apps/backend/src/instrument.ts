import { env } from './config/env';
// OTel MUST be initialised before any other imports so auto-instrumentation
// can patch modules (http, pg, ioredis, bullmq) at load time.
import './tracing';

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: env.sentryDsn,
  environment: env.nodeEnv,
  release: env.gitCommitSha,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: env.isProduction ? 0.1 : 1.0,
  profilesSampleRate: env.isProduction ? 0.1 : 1.0,
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) delete event.request.headers['authorization'];
    }
    return event;
  },
});
