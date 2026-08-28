/**
 * NestJS ConfigModule factory.
 *
 * Maps every environment variable that appears in `validation.schema.ts` into
 * a typed, nested configuration object.  Access values via ConfigService:
 *
 *   config.get<string>('database.host')
 *   config.get<number>('dbPool.max')
 *   config.get<string>('sentry.dsn')
 *   config.get<string>('logging.level')
 *
 * Issue #805 audit: the variables below were previously consumed via raw
 * `process.env` scattered across the codebase.  They are now centralised here
 * so that a single validated, typed configuration object is the only source of
 * truth.
 */
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // ── Logging ────────────────────────────────────────────────────────────────
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // ── Database ───────────────────────────────────────────────────────────────
  database: {
    host: process.env.DATABASE_HOST!,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    name: process.env.DATABASE_NAME!,
  },

  // Database connection-pool settings — previously read via raw process.env in
  // app.module.ts and db-pool.config.ts (issue #805).
  dbPool: {
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    min: parseInt(process.env.DB_POOL_MIN || '5', 10),
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
  },

  // ── JWT ────────────────────────────────────────────────────────────────────
  jwt: {
    secret: process.env.JWT_SECRET!,
  },

  // ── Redis ──────────────────────────────────────────────────────────────────
  redis: {
    url: process.env.REDIS_URL!,
  },

  // ── Stellar ────────────────────────────────────────────────────────────────
  stellar: {
    network: process.env.STELLAR_NETWORK as 'testnet' | 'mainnet',
    secretKey: process.env.STELLAR_SECRET_KEY!,
    horizonUrl:
      process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
    contractId: process.env.SOROBAN_CONTRACT_ID || '',
    analyticsContractId: process.env.ANALYTICS_CONTRACT_ID || '',
    tokenContractId: process.env.TOKEN_CONTRACT_ID || '',
    indexerPollIntervalMs: parseInt(process.env.INDEXER_POLL_INTERVAL_MS || '5000', 10),
    webAuthDomain: process.env.STELLAR_WEB_AUTH_DOMAIN || 'localhost',
  },

  // ── Mail ───────────────────────────────────────────────────────────────────
  mail: {
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
    from: process.env.EMAIL_FROM || '"Brain Storm" <no-reply@brainstorm.app>',
    enabled: process.env.EMAIL_ENABLED === 'true',
  },

  // ── Google OAuth ───────────────────────────────────────────────────────────
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
  },

  // ── Frontend ───────────────────────────────────────────────────────────────
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3001',
  },

  // ── CORS ───────────────────────────────────────────────────────────────────
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10),
  },

  // ── Throttle ───────────────────────────────────────────────────────────────
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },

  // ── KYC ────────────────────────────────────────────────────────────────────
  kyc: {
    providerApiKey: process.env.KYC_PROVIDER_API_KEY || '',
  },

  // ── AWS ────────────────────────────────────────────────────────────────────
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  // ── Moderation ─────────────────────────────────────────────────────────────
  moderation: {
    toxicityThreshold: parseFloat(process.env.MODERATION_TOXICITY_THRESHOLD || '0.7'),
  },

  // ── Elasticsearch ──────────────────────────────────────────────────────────
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    apiKey: process.env.ELASTICSEARCH_API_KEY || '',
  },

  // ── Stripe ─────────────────────────────────────────────────────────────────
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },

  // ── Sentry / Observability ─────────────────────────────────────────────────
  // These values are read directly by instrument.ts (which must load before
  // NestJS boots), so they are also surfaced here for components that need to
  // access them via ConfigService.
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    release: process.env.GIT_COMMIT_SHA || 'unknown',
  },

  // ── OpenTelemetry ──────────────────────────────────────────────────────────
  otel: {
    serviceName: process.env.OTEL_SERVICE_NAME || 'brain-storm-api',
    exporterOtlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    tracesSamplerArg: process.env.OTEL_TRACES_SAMPLER_ARG || '0.1',
  },

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  rateLimit: {
    admin: Number(process.env.RATE_LIMIT_ADMIN || '10000'),
    instructor: Number(process.env.RATE_LIMIT_INSTRUCTOR || '5000'),
    student: Number(process.env.RATE_LIMIT_STUDENT || '1000'),
    guest: Number(process.env.RATE_LIMIT_GUEST || '100'),
    allowlist: (process.env.RATE_LIMIT_ALLOWLIST || '').split(',').filter(Boolean),
  },

  // ── Audit ──────────────────────────────────────────────────────────────────
  audit: {
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS ?? '365', 10),
  },

  // ── Graceful Shutdown ──────────────────────────────────────────────────────
  shutdown: {
    drainTimeoutMs: parseInt(process.env.SHUTDOWN_DRAIN_TIMEOUT_MS ?? '10000', 10),
  },

  // ── Export OpenAPI ────────────────────────────────────────────────────────
  exportOpenapi: process.env.EXPORT_OPENAPI === 'true',
});
