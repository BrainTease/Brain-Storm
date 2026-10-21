/**
 * Performance seed entry point — seeds a large data set intended for
 * load / performance testing (500 users, 50 courses, full relations).
 *
 * Invoked via: npm run seed:performance --workspace=apps/backend
 * Which resolves to: ts-node -r tsconfig-paths/register src/test/seeds/performance.seed.ts
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { SeedService } from '../../database/seed.service';
import { env } from '../../config/env';

async function bootstrap(): Promise<void> {
  const logger = new Logger('PerformanceSeed');

  if (env.isProduction) {
    logger.error('❌ Refusing to seed in production. Set NODE_ENV to development or staging.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const seedService = app.get(SeedService);

  try {
    logger.log('🌱 Running performance seed (500 users, 50 courses) …');
    await seedService.seed({ count: 500, includeReviews: true, includeTips: true });
    logger.log('✅ Performance seed complete.');
  } catch (err) {
    logger.error('❌ Performance seed failed:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
