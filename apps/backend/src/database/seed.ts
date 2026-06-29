import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

async function bootstrap() {
  const logger = new Logger('SeedBootstrap');

  if (process.env.NODE_ENV === 'production') {
    logger.error('❌ Refusing to seed in production environment!');
    logger.error('Set NODE_ENV=development or NODE_ENV=staging to proceed.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(SeedService);

  try {
    const options = {
      includeReviews: process.argv.includes('--with-reviews'),
      includeTips: process.argv.includes('--with-tips'),
      count: parseInt(process.argv.find(a => a.startsWith('--count='))?.split('=')[1] || '10', 10),
    };

    logger.log('🌱 Starting database seed...');
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`Options: ${JSON.stringify(options)}`);

    await seedService.seed(options);

    logger.log('✅ Seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();