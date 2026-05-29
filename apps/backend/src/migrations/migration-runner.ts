import { AppDataSource } from '../data-source';

async function runMigrations() {
  await AppDataSource.initialize();
  const pending = await AppDataSource.showMigrations();
  if (!pending) {
    console.log('No pending migrations');
    await AppDataSource.destroy();
    return;
  }
  await AppDataSource.runMigrations({ transaction: 'each' });
  console.log('Migrations completed');
  await AppDataSource.destroy();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
