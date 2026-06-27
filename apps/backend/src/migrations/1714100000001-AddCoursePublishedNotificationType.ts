import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoursePublishedNotificationType1714100000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'course_published'
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres does not support removing enum values; no-op on rollback.
  }
}
