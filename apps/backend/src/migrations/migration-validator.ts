import { Logger } from '@nestjs/common';

import { AppDataSource } from '../data-source';

const logger = new Logger('Migrations');

interface MigrationRecord {
  id: number;
  timestamp: number;
  name: string;
}

async function validateMigrations() {
  await AppDataSource.initialize();

  const executedMigrations: MigrationRecord[] = await AppDataSource.query(
    `SELECT id, timestamp, name FROM migrations ORDER BY timestamp ASC`
  ).catch(() => []);

  const allMigrations = AppDataSource.migrations;

  logger.log(`Registered migrations: ${allMigrations.length}`);
  logger.log(`Executed migrations:   ${executedMigrations.length}`);

  // Check for timestamp ordering issues
  const timestamps = allMigrations.map((m: { name?: string }) => {
    const match = m.name?.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });

  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] <= timestamps[i - 1]) {
      logger.error(`Timestamp ordering error between migration ${i - 1} and ${i}`);
      process.exit(1);
    }
  }

  // Check for duplicate timestamps
  const seen = new Set<number>();
  for (const ts of timestamps) {
    if (seen.has(ts)) {
      logger.error(`Duplicate migration timestamp detected: ${ts}`);
      process.exit(1);
    }
    seen.add(ts);
  }

  logger.log('Migration validation passed');
  await AppDataSource.destroy();
}

validateMigrations().catch((err) => {
  logger.error('Validation error:', err);
  process.exit(1);
});
