import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SanitizationPipe } from './common/pipes/sanitization.pipe';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';
// #709: gzip/brotli compression — reduces payload size by 60–80 % for JSON
import * as compression from 'compression';
import { SparseFieldsInterceptor } from './common/interceptors/sparse-fields.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('port');
  const nodeEnv = configService.get<string>('nodeEnv');

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // #709: Enable gzip/brotli response compression for all eligible responses.
  // Thresholds: 1 KB minimum, honours Accept-Encoding header (gzip / br).
  // This alone cuts JSON list-endpoint payloads by ~65–75 %.
  app.use(compression({ threshold: 1024 }));

  app.use('/v0', (req, res) => {
    res.status(410).json({
      message: 'The /v0 API is deprecated. Please migrate to /v1.',
      migrationGuide: '/api/docs#versioning',
      deprecated: true,
    });
  });

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }), new SanitizationPipe());
  // #799: Single unified exception filter — replaces HttpExceptionFilter +
  // ValidationExceptionFilter + ErrorHandlingMiddleware (all had inconsistent shapes).
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new MetricsInterceptor(app.get(MetricsService)),
    // #709: trim response to ?fields= requested keys (reduces payload by up to 85 %)
    new SparseFieldsInterceptor(),
  );

  const corsOrigins = configService.get<string[]>('cors.origins') || ['http://localhost:3001'];
  const corsCredentials = configService.get<boolean>('cors.credentials') ?? false;
  const corsPreflight = configService.get<number>('cors.maxAge') ?? 86400;

  // ── Strict CORS ─────────────────────────────────────────────────────────────
  // Always apply an explicit allow-list; development uses the configured origins,
  // never a wildcard, to prevent accidental exposure.
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (e.g. server-to-server, curl in dev)
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY', 'X-Webhook-Signature'],
    credentials: corsCredentials,
    maxAge: corsPreflight,
  });

  const config = new DocumentBuilder()
    .setTitle('Brain-Storm API')
    .setDescription(
      'Blockchain education platform API powered by Stellar\n\n' +
        '## Authentication\n\n' +
        'This API uses JWT Bearer tokens for authentication.\n\n' +
        '### Getting Started\n\n' +
        '1. **Register**: POST /v1/auth/register with email and password\n' +
        '2. **Login**: POST /v1/auth/login to receive access_token\n' +
        '3. **Authorize**: Click "Authorize" button and enter: `Bearer <access_token>`\n' +
        '4. **Use API**: All protected endpoints now accessible\n\n' +
        '### Example Flow\n\n' +
        '```bash\n' +
        '# Register\n' +
        'curl -X POST https://api.brain-storm.com/v1/auth/register \\\n' +
        '  -H "Content-Type: application/json" \\\n' +
        '  -d \'{"email":"user@example.com","password":"securepass123"}\'\n\n' +
        '# Login\n' +
        'curl -X POST https://api.brain-storm.com/v1/auth/login \\\n' +
        '  -H "Content-Type: application/json" \\\n' +
        '  -d \'{"email":"user@example.com","password":"securepass123"}\'\n\n' +
        '# Use token in subsequent requests\n' +
        'curl -X GET https://api.brain-storm.com/v1/courses \\\n' +
        '  -H "Authorization: Bearer <your_access_token>"\n' +
        '```'
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from /v1/auth/login',
      },
      'JWT-auth'
    )
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-KEY' }, 'X-API-KEY')
    .addServer('/v1', 'API v1')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Export OpenAPI spec for static hosting
  if (process.env.EXPORT_OPENAPI === 'true' || process.argv.includes('--export-openapi')) {
    const outputPath = join(__dirname, '..', 'openapi.json');
    writeFileSync(outputPath, JSON.stringify(document, null, 2));
    logger.log(`OpenAPI spec exported to ${outputPath}`);
    process.exit(0);
  }

  await app.listen(port ?? 3000);
  logger.log(`Brain-Storm API running on port ${port} [${nodeEnv}]`);
}
bootstrap();
