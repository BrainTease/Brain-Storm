/**
 * Basic seed entry point — seeds a small representative data set
 * (10 users, 5 courses, enrollments, progress records).
 *
 * Invoked via: npm run seed:basic --workspace=apps/backend
 * Which resolves to: ts-node -r tsconfig-paths/register src/test/seeds/basic.seed.ts
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { SeedService } from '../../database/seed.service';
import { env } from '../../config/env';

async function bootstrap(): Promise<void> {
  const logger = new Logger('BasicSeed');

  if (env.isProduction) {
    logger.error('❌ Refusing to seed in production. Set NODE_ENV to development or staging.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const seedService = app.get(SeedService);

  try {
    logger.log('🌱 Running basic seed (10 users, 5 courses) …');
    await seedService.seed({ count: 10, includeReviews: false, includeTips: false });
    logger.log('✅ Basic seed complete.');
  } catch (err) {
    logger.error('❌ Basic seed failed:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
