import { Logger } from '@nestjs/common';

import { AppDataSource } from '../data-source';

const logger = new Logger('Migrations');

async function rollbackMigration() {
  await AppDataSource.initialize();
  await AppDataSource.undoLastMigration({ transaction: 'each' });
  logger.log('Last migration rolled back');
  await AppDataSource.destroy();
}

rollbackMigration().catch((err) => {
  logger.error('Rollback failed:', err);
  process.exit(1);
});
