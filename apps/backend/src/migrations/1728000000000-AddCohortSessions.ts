import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddCohortSessions1728000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create cohort_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'cohort_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'cohortId',
            type: 'uuid',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'startTime',
            type: 'timestamp',
          },
          {
            name: 'endTime',
            type: 'timestamp',
          },
          {
            name: 'videoProviderId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'recordingUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'SCHEDULED'",
          },
          {
            name: 'instructorId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['cohortId'],
            referencedTableName: 'cohorts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['instructorId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        ],
      }),
      true,
    );

    // Create indexes for cohort_sessions
    await queryRunner.createIndex(
      'cohort_sessions',
      new TableIndex({
        columnNames: ['cohortId', 'startTime'],
        name: 'IDX_cohort_sessions_cohort_start',
      }),
    );

    await queryRunner.createIndex(
      'cohort_sessions',
      new TableIndex({
        columnNames: ['status', 'startTime'],
        name: 'IDX_cohort_sessions_status_start',
      }),
    );

    // Create session_attendances table
    await queryRunner.createTable(
      new Table({
        name: 'session_attendances',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'sessionId',
            type: 'uuid',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'ABSENT'",
          },
          {
            name: 'joinedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'leftAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['sessionId'],
            referencedTableName: 'cohort_sessions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
        uniques: [
          {
            name: 'UQ_session_attendances_session_user',
            columnNames: ['sessionId', 'userId'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('session_attendances');
    await queryRunner.dropTable('cohort_sessions');
  }
}
