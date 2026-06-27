import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import * as path from 'path';

let container: StartedPostgreSqlContainer;
let dataSource: DataSource;

export async function setupTestDatabase(): Promise<DataSource> {
  container = await new PostgreSqlContainer()
    .withDatabase('brain-storm-test')
    .withUsername('test-user')
    .withPassword('test-password')
    .start();

  const host = container.getHost();
  const port = container.getPort();
  const username = container.getUsername();
  const password = container.getPassword();
  const database = container.getDatabase();

  dataSource = new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    entities: [path.join(__dirname, '../**/*.entity.ts')],
    migrations: [path.join(__dirname, '../migrations/*.ts')],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  await dataSource.runMigrations();

  return dataSource;
}

export async function teardownTestDatabase(): Promise<void> {
  if (dataSource) {
    await dataSource.destroy();
  }
  if (container) {
    await container.stop();
  }
}

export function getTestDataSource(): DataSource {
  return dataSource;
}
