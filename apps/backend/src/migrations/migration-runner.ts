import { Logger } from '@nestjs/common';

import { AppDataSource } from '../data-source';

const logger = new Logger('Migrations');

async function runMigrations() {
  await AppDataSource.initialize();
  const pending = await AppDataSource.showMigrations();
  if (!pending) {
    logger.log('No pending migrations');
    await AppDataSource.destroy();
    return;
  }
  await AppDataSource.runMigrations({ transaction: 'each' });
  logger.log('Migrations completed');
  await AppDataSource.destroy();
}

runMigrations().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
});
