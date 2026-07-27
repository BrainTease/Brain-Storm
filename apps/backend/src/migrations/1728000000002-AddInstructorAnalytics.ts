import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddInstructorAnalytics1728000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'instructor_analytics',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'instructorId', type: 'uuid' },
          { name: 'courseId', type: 'uuid' },
          { name: 'month', type: 'varchar' }, // YYYY-MM
          { name: 'enrollments', type: 'integer', default: 0 },
          { name: 'completions', type: 'integer', default: 0 },
          { name: 'averageRating', type: 'decimal', precision: 3, scale: 2, default: 0 },
          { name: 'totalReviews', type: 'integer', default: 0 },
          { name: 'revenue', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'payout', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['instructorId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['courseId'],
            referencedTableName: 'courses',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'instructor_analytics',
      new TableIndex({
        columnNames: ['instructorId', 'courseId', 'month'],
        name: 'IDX_instructor_analytics_lookup',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('instructor_analytics');
  }
}
