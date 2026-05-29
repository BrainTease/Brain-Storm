import { AppDataSource } from '../data-source';

async function rollbackMigration() {
  await AppDataSource.initialize();
  await AppDataSource.undoLastMigration({ transaction: 'each' });
  console.log('Last migration rolled back');
  await AppDataSource.destroy();
}

rollbackMigration().catch((err) => {
  console.error('Rollback failed:', err);
  process.exit(1);
});
