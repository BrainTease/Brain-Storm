import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseScheduling1714100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "courses_status_enum" AS ENUM ('draft', 'scheduled', 'published')
    `);
    await queryRunner.query(`
      ALTER TABLE "courses"
        ADD COLUMN "status" "courses_status_enum" NOT NULL DEFAULT 'draft',
        ADD COLUMN "scheduledAt" TIMESTAMPTZ,
        ADD COLUMN "publishedAt" TIMESTAMPTZ
    `);
    // Back-fill: existing published courses → published status
    await queryRunner.query(`
      UPDATE "courses" SET "status" = 'published', "publishedAt" = "createdAt" WHERE "isPublished" = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "courses"
        DROP COLUMN "status",
        DROP COLUMN "scheduledAt",
        DROP COLUMN "publishedAt"
    `);
    await queryRunner.query(`DROP TYPE "courses_status_enum"`);
  }
}
