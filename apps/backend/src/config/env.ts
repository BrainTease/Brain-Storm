/**
 * Typed snapshot of the environment for code that cannot use Nest's ConfigService: bootstrap files
 * that run before the DI container exists (instrument.ts, tracing.ts, data-source.ts), and plain
 * modules outside it. Read every variable here, once, with its default. Everything else should
 * inject ConfigService.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL || 'info',
  appVersion: process.env.APP_VERSION ?? 'unknown',
  gitCommitSha: process.env.GIT_COMMIT_SHA || 'unknown',
  sentryDsn: process.env.SENTRY_DSN,
  indexerCatchup: process.env.INDEXER_CATCHUP === 'true',

  databaseHost: process.env.DATABASE_HOST || 'localhost',
  databasePort: parseInt(process.env.DATABASE_PORT || '5432', 10),
  databaseUser: process.env.DATABASE_USER,
  databasePassword: process.env.DATABASE_PASSWORD,
  databaseName: process.env.DATABASE_NAME || 'brain-storm',

  dbPoolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
  dbPoolMin: parseInt(process.env.DB_POOL_MIN || '5', 10),
  dbAcquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000', 10),
  dbIdleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),

  otelServiceName: process.env.OTEL_SERVICE_NAME ?? 'brain-storm-api',
  otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318',
  otelTracesSampler: parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG ?? '0.1'),
};
