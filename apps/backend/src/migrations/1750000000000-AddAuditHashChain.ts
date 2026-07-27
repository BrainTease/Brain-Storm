import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditHashChain1750000000000 implements MigrationInterface {
  name = 'AddAuditHashChain1750000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "prevHash" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entryHash" character varying(64)`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "ipAddress" TYPE text`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "userAgent" TYPE text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "prevHash"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "entryHash"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "ipAddress" TYPE character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "userAgent" TYPE character varying`,
    );
  }
}
