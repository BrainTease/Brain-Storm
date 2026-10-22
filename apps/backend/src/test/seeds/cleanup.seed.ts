/**
 * Cleanup seed entry point — removes seeded test data from the database.
 *
 * Invoked via: npm run seed:cleanup --workspace=apps/backend
 * Which resolves to: ts-node -r tsconfig-paths/register src/test/seeds/cleanup.seed.ts
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { env } from '../../config/env';

async function bootstrap(): Promise<void> {
  const logger = new Logger('CleanupSeed');

  if (env.isProduction) {
    logger.error('❌ Refusing to truncate in production. Set NODE_ENV to development or staging.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const dataSource = app.get<DataSource>(getDataSourceToken());

  try {
    logger.log('🗑️  Truncating seeded tables …');

    // Truncate in dependency order (children first, then parents)
    const tables = [
      'progress',
      'enrollment',
      'review',
      'lesson',
      'course_module',
      'notification',
      'course',
      'user',
    ];

    for (const table of tables) {
      await dataSource.query(`TRUNCATE TABLE "${table}" CASCADE`);
      logger.log(`  ✓ ${table} cleared`);
    }

    logger.log('✅ Cleanup complete.');
  } catch (err) {
    logger.error('❌ Cleanup failed:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
