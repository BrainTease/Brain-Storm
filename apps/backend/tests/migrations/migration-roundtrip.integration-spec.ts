import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource, Table } from 'typeorm';
import { AddSoftDeleteAuditColumns1760000000000 } from '../../src/migrations/1760000000000-AddSoftDeleteAuditColumns';

describe('migration up/down integration (#1520)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('migration_test')
      .withUsername('migration_test')
      .withPassword('migration_test')
      .start();

    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      synchronize: false,
      entities: [],
    });
    await dataSource.initialize();

    const queryRunner = dataSource.createQueryRunner();
    const baseTable = (name: string) =>
      new Table({
        name,
        columns: [{ name: 'id', type: 'uuid', isPrimary: true }],
      });
    await queryRunner.createTable(baseTable('users'));
    await queryRunner.createTable(baseTable('courses'));
    await queryRunner.release();
  }, 120_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (container) await container.stop();
  });

  it('applies, rolls back, and reapplies the audit-column migration', async () => {
    const queryRunner = dataSource.createQueryRunner();
    const migration = new AddSoftDeleteAuditColumns1760000000000();

    try {
      await migration.up(queryRunner);
      for (const tableName of ['users', 'courses']) {
        const table = await queryRunner.getTable(tableName);
        expect(table?.columns.map(({ name }) => name)).toEqual(
          expect.arrayContaining(['createdBy', 'updatedBy', 'updatedAt'])
        );
      }
      expect((await queryRunner.getTable('courses'))?.columns.map(({ name }) => name)).toContain(
        'deletedAt'
      );

      await migration.down(queryRunner);
      for (const tableName of ['users', 'courses']) {
        const table = await queryRunner.getTable(tableName);
        expect(table?.columns.map(({ name }) => name)).not.toEqual(
          expect.arrayContaining(['createdBy', 'updatedBy', 'updatedAt'])
        );
      }
      expect((await queryRunner.getTable('courses'))?.columns.map(({ name }) => name)).not.toContain(
        'deletedAt'
      );

      await migration.up(queryRunner);
      expect((await queryRunner.getTable('users'))?.columns.map(({ name }) => name)).toContain(
        'updatedAt'
      );
    } finally {
      await queryRunner.release();
    }
  });
});