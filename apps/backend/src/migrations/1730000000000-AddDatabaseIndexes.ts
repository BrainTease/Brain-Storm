import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDatabaseIndexes1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Stellar transaction logs indexes - for common query patterns
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stellar_tx_logs_recipient_public_key" ON "stellar_transaction_logs" ("recipientPublicKey")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stellar_tx_logs_type" ON "stellar_transaction_logs" ("type")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stellar_tx_logs_status" ON "stellar_transaction_logs" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stellar_tx_logs_created_at" ON "stellar_transaction_logs" ("createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stellar_tx_logs_tx_hash" ON "stellar_transaction_logs" ("txHash")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stellar_tx_logs_course_id" ON "stellar_transaction_logs" ("courseId")`
    );

    // Composite indexes for common filter combinations
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stellar_tx_logs_type_status" ON "stellar_transaction_logs" ("type", "status")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stellar_tx_logs_recipient_created" ON "stellar_transaction_logs" ("recipientPublicKey", "createdAt" DESC)`
    );

    // Enrollments indexes - for user progress tracking
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_enrollments_user_id" ON "enrollments" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_enrollments_course_id" ON "enrollments" ("courseId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_enrollments_status" ON "enrollments" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_enrollments_user_course" ON "enrollments" ("userId", "courseId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_enrollments_created_at" ON "enrollments" ("createdAt")`
    );

    // Users indexes - for authentication and lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_wallet_address" ON "users" ("walletAddress")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_is_active" ON "users" ("isActive")`
    );

    // Audit logs indexes - for compliance and debugging
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_type" ON "audit_logs" ("entityType")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_user" ON "audit_logs" ("action", "userId", "createdAt" DESC)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop stellar transaction logs indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_recipient_public_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_tx_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_course_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_type_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_recipient_created"`);

    // Drop enrollments indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enrollments_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enrollments_course_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enrollments_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enrollments_user_course"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enrollments_created_at"`);

    // Drop users indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_wallet_address"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_is_active"`);

    // Drop audit logs indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_entity_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_action_user"`);
  }
}
