/**
 * Setup file for HTTP-layer integration tests
 * 
 * Configures test environment, database connection, and global test utilities
 * for deterministic auth and users API endpoint testing.
 */

import { DataSource } from 'typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

// Global test database state
let globalContainer: StartedPostgreSqlContainer;
let globalDataSource: DataSource;

/**
 * Global setup - runs once before all test suites
 */
beforeAll(async () => {
  // Start PostgreSQL container
  globalContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('brain-storm-test')
    .withUsername('test-user')
    .withPassword('test-password')
    .withExposedPorts(5432)
    .start();

  // Create DataSource for migrations
  globalDataSource = new DataSource({
    type: 'postgres',
    host: globalContainer.getHost(),
    port: globalContainer.getPort(),
    username: globalContainer.getUsername(),
    password: globalContainer.getPassword(),
    database: globalContainer.getDatabase(),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true, // Auto-create schema for tests
    logging: false,
  });

  await globalDataSource.initialize();
  
  // Store connection info in environment for tests
  process.env.TEST_DB_HOST = globalContainer.getHost();
  process.env.TEST_DB_PORT = globalContainer.getPort().toString();
  process.env.TEST_DB_USERNAME = globalContainer.getUsername();
  process.env.TEST_DB_PASSWORD = globalContainer.getPassword();
  process.env.TEST_DB_DATABASE = globalContainer.getDatabase();
}, 120000); // 2 minute timeout for container startup

/**
 * Global teardown - runs once after all test suites
 */
afterAll(async () => {
  if (globalDataSource && globalDataSource.isInitialized) {
    await globalDataSource.destroy();
  }
  
  if (globalContainer) {
    await globalContainer.stop();
  }
}, 60000);

/**
 * Export test database configuration
 */
export function getTestDatabaseConfig() {
  return {
    type: 'postgres' as const,
    host: process.env.TEST_DB_HOST,
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    username: process.env.TEST_DB_USERNAME,
    password: process.env.TEST_DB_PASSWORD,
    database: process.env.TEST_DB_DATABASE,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
  };
}

/**
 * Get initialized DataSource for cleanup operations
 */
export function getTestDataSource(): DataSource {
  return globalDataSource;
}
