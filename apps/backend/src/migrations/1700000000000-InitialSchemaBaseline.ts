import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Consolidated baseline schema migration.
 *
 * This squashes the following historical, pre-1.0 migrations into a single
 * unit (see MIGRATIONS.md for the policy that governs future squashes):
 *   - 1700000000000-InitialMigration
 *   - 1711700000000-AddApiKeys
 *   - 1711800000000-AddReviews
 *   - 1711900000000-AddForums
 *   - 1714000000000-AddReferrals
 *   - 1714100000000-AddCourseScheduling
 *   - 1714100000001-AddCoursePublishedNotificationType
 *   - 1720000000000-AddSurveys
 *   - 1725000000000-AddImportJobTypeAndKycDocument
 *   - 1728000000000-AddCohortSessions
 *   - 1728000000001-AddMultiTenancy
 *   - 1728000000002-AddInstructorAnalytics
 *   - 1730000000000-AddDatabaseIndexes
 *
 * The up()/down() bodies below are the original per-migration bodies
 * concatenated in their original chronological order, so the resulting
 * schema for a fresh database is byte-for-byte identical to running the
 * 13 individual migrations in sequence. Environments that already applied
 * the individual migrations are unaffected — TypeORM tracks completed
 * migrations by name in the `migrations` table, so this file only runs on
 * fresh (empty) databases.
 */
export class InitialSchemaBaseline1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── InitialMigration: users, courses, notifications ──────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'passwordHash', type: 'varchar' },
          { name: 'stellarPublicKey', type: 'varchar', isNullable: true },
          { name: 'role', type: 'varchar', default: "'student'" },
          { name: 'isBanned', type: 'boolean', default: false },
          { name: 'isVerified', type: 'boolean', default: false },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'courses',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text' },
          { name: 'level', type: 'varchar', default: "'beginner'" },
          { name: 'durationHours', type: 'int', default: 0 },
          { name: 'isPublished', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'varchar' },
          { name: 'type', type: 'enum', enum: ['enrollment', 'completion', 'credential_issued'] },
          { name: 'message', type: 'varchar' },
          { name: 'isRead', type: 'boolean', default: false },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    // ── AddApiKeys ─────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'api_keys',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
          { name: 'keyHash', type: 'varchar', isUnique: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'userId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'lastUsedAt', type: 'timestamp', isNullable: true },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // ── AddReviews ─────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'reviews',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid' },
          { name: 'courseId', type: 'uuid' },
          { name: 'rating', type: 'int' },
          { name: 'comment', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
        uniques: [{ columnNames: ['userId', 'courseId'] }],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['courseId'],
            referencedTableName: 'courses',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // ── AddForums: posts, replies ──────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'posts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'courseId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'title', type: 'varchar' },
          { name: 'content', type: 'text' },
          { name: 'isPinned', type: 'boolean', default: false },
          { name: 'answerReplyId', type: 'uuid', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['courseId'],
            referencedTableName: 'courses',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'replies',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'postId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'content', type: 'text' },
          { name: 'isAnswer', type: 'boolean', default: false },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['postId'],
            referencedTableName: 'posts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // ── AddReferrals ───────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "referralCode" varchar UNIQUE`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "referredBy" varchar`);

    // ── AddCourseScheduling ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "courses_status_enum" AS ENUM ('draft', 'scheduled', 'published')
    `);
    await queryRunner.query(`
      ALTER TABLE "courses"
        ADD COLUMN "status" "courses_status_enum" NOT NULL DEFAULT 'draft',
        ADD COLUMN "scheduledAt" TIMESTAMPTZ,
        ADD COLUMN "publishedAt" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      UPDATE "courses" SET "status" = 'published', "publishedAt" = "createdAt" WHERE "isPublished" = true
    `);

    // ── AddCoursePublishedNotificationType ─────────────────────────────────
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'course_published'
    `);

    // ── AddSurveys: surveys, survey_questions, survey_responses ────────────
    await queryRunner.createTable(
      new Table({
        name: 'surveys',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'courseId', type: 'uuid' },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text' },
          { name: 'triggerType', type: 'enum', enum: ['completion', 'milestone'], default: "'completion'" },
          { name: 'triggerMilestone', type: 'int', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'surveys',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'survey_questions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'surveyId', type: 'uuid' },
          { name: 'text', type: 'text' },
          { name: 'type', type: 'enum', enum: ['rating', 'text', 'mcq'] },
          { name: 'options', type: 'text', isNullable: true },
          { name: 'order', type: 'int' },
          { name: 'required', type: 'boolean', default: true },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'survey_questions',
      new TableForeignKey({
        columnNames: ['surveyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'surveys',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'survey_responses',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'surveyId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'answers', type: 'jsonb' },
          { name: 'submittedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'survey_responses',
      new TableForeignKey({
        columnNames: ['surveyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'surveys',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'survey_responses',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    // ── AddImportJobTypeAndKycDocument ──────────────────────────────────────
    await queryRunner.query(`CREATE TYPE "import_jobs_type_enum" AS ENUM ('course', 'user')`);
    await queryRunner.query(
      `ALTER TABLE "import_jobs" ADD "type" "import_jobs_type_enum" NOT NULL DEFAULT 'course'`
    );

    await queryRunner.query(`CREATE TABLE "kyc_documents" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "stellarPublicKey" character varying NOT NULL,
      "filename" character varying NOT NULL,
      "mimetype" character varying NOT NULL,
      "providerReference" character varying,
      "metadata" jsonb,
      "size" integer NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_kyc_documents_id" PRIMARY KEY ("id")
    )`);

    // ── AddCohortSessions: cohort_sessions, session_attendances ────────────
    await queryRunner.createTable(
      new Table({
        name: 'cohort_sessions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'cohortId', type: 'uuid' },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'startTime', type: 'timestamp' },
          { name: 'endTime', type: 'timestamp' },
          { name: 'videoProviderId', type: 'varchar', isNullable: true },
          { name: 'recordingUrl', type: 'varchar', isNullable: true },
          { name: 'status', type: 'varchar', default: "'SCHEDULED'" },
          { name: 'instructorId', type: 'uuid', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
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
      true
    );

    await queryRunner.createIndex(
      'cohort_sessions',
      new TableIndex({
        columnNames: ['cohortId', 'startTime'],
        name: 'IDX_cohort_sessions_cohort_start',
      })
    );

    await queryRunner.createIndex(
      'cohort_sessions',
      new TableIndex({
        columnNames: ['status', 'startTime'],
        name: 'IDX_cohort_sessions_status_start',
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'session_attendances',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'sessionId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'status', type: 'varchar', default: "'ABSENT'" },
          { name: 'joinedAt', type: 'timestamp', isNullable: true },
          { name: 'leftAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
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
        uniques: [{ name: 'UQ_session_attendances_session_user', columnNames: ['sessionId', 'userId'] }],
      }),
      true
    );

    // ── AddMultiTenancy: organizations, organization_members, billing ─────
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'slug', type: 'varchar', isUnique: true },
          { name: 'name', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'logo', type: 'varchar', isNullable: true },
          { name: 'seats', type: 'integer', default: 0 },
          { name: 'usedSeats', type: 'integer', default: 0 },
          { name: 'domain', type: 'varchar', isNullable: true },
          { name: 'active', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({ columnNames: ['slug'], isUnique: true, name: 'IDX_organizations_slug' })
    );

    await queryRunner.createTable(
      new Table({
        name: 'organization_members',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'organizationId', type: 'uuid' },
          { name: 'userId', type: 'uuid', isNullable: true },
          { name: 'role', type: 'varchar', default: "'MEMBER'" },
          { name: 'invitedEmail', type: 'varchar', isNullable: true },
          { name: 'invitePending', type: 'boolean', default: false },
          { name: 'inviteToken', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['organizationId'],
            referencedTableName: 'organizations',
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
        uniques: [{ columnNames: ['organizationId', 'userId'], name: 'UQ_org_members_org_user' }],
      }),
      true
    );

    await queryRunner.createIndex(
      'organization_members',
      new TableIndex({ columnNames: ['organizationId', 'role'], name: 'IDX_org_members_org_role' })
    );

    await queryRunner.createTable(
      new Table({
        name: 'organization_billing_profiles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'organizationId', type: 'uuid' },
          { name: 'stripeCustomerId', type: 'varchar' },
          { name: 'paymentMethodId', type: 'varchar', isNullable: true },
          { name: 'monthlyBudget', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'spent', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'billingEmail', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['organizationId'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true
    );

    await queryRunner.addColumn('courses', {
      name: 'organizationId',
      type: 'uuid',
      isNullable: true,
    } as any);

    await queryRunner.createForeignKey(
      'courses',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // ── AddInstructorAnalytics ───────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'instructor_analytics',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'instructorId', type: 'uuid' },
          { name: 'courseId', type: 'uuid' },
          { name: 'month', type: 'varchar' },
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
      true
    );

    await queryRunner.createIndex(
      'instructor_analytics',
      new TableIndex({
        columnNames: ['instructorId', 'courseId', 'month'],
        name: 'IDX_instructor_analytics_lookup',
      })
    );

    // ── AddDatabaseIndexes ─────────────────────────────────────────────────
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
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stellar_tx_logs_type_status" ON "stellar_transaction_logs" ("type", "status")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_stellar_tx_logs_recipient_created" ON "stellar_transaction_logs" ("recipientPublicKey", "createdAt" DESC)`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_enrollments_user_id" ON "enrollments" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_enrollments_course_id" ON "enrollments" ("courseId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_enrollments_status" ON "enrollments" ("status")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_enrollments_user_course" ON "enrollments" ("userId", "courseId")`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_enrollments_created_at" ON "enrollments" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_wallet_address" ON "users" ("walletAddress")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_is_active" ON "users" ("isActive")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_type" ON "audit_logs" ("entityType")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("createdAt")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_user" ON "audit_logs" ("action", "userId", "createdAt" DESC)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── reverse of AddDatabaseIndexes ──────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_recipient_public_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_tx_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_course_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_type_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stellar_tx_logs_recipient_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enrollments_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enrollments_course_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enrollments_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enrollments_user_course"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enrollments_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_wallet_address"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_entity_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_action_user"`);

    // ── reverse of AddInstructorAnalytics ──────────────────────────────────
    await queryRunner.dropTable('instructor_analytics');

    // ── reverse of AddMultiTenancy ──────────────────────────────────────────
    await queryRunner.dropForeignKey('courses', 'FK_courses_organizationId');
    await queryRunner.dropColumn('courses', 'organizationId');
    await queryRunner.dropTable('organization_billing_profiles');
    await queryRunner.dropTable('organization_members');
    await queryRunner.dropTable('organizations');

    // ── reverse of AddCohortSessions ────────────────────────────────────────
    await queryRunner.dropTable('session_attendances');
    await queryRunner.dropTable('cohort_sessions');

    // ── reverse of AddImportJobTypeAndKycDocument ──────────────────────────
    await queryRunner.query('DROP TABLE "kyc_documents"');
    await queryRunner.query('ALTER TABLE "import_jobs" DROP COLUMN "type"');
    await queryRunner.query('DROP TYPE "import_jobs_type_enum"');

    // ── reverse of AddSurveys ────────────────────────────────────────────────
    await queryRunner.dropTable('survey_responses');
    await queryRunner.dropTable('survey_questions');
    await queryRunner.dropTable('surveys');

    // ── reverse of AddCoursePublishedNotificationType (no-op, see original) ──
    // Postgres does not support removing enum values; no-op on rollback.

    // ── reverse of AddCourseScheduling ──────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "courses"
        DROP COLUMN "status",
        DROP COLUMN "scheduledAt",
        DROP COLUMN "publishedAt"
    `);
    await queryRunner.query(`DROP TYPE "courses_status_enum"`);

    // ── reverse of AddReferrals ──────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referredBy"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referralCode"`);

    // ── reverse of AddForums ─────────────────────────────────────────────────
    await queryRunner.dropTable('replies');
    await queryRunner.dropTable('posts');

    // ── reverse of AddReviews ────────────────────────────────────────────────
    await queryRunner.dropTable('reviews');

    // ── reverse of AddApiKeys ────────────────────────────────────────────────
    await queryRunner.dropTable('api_keys');

    // ── reverse of InitialMigration ──────────────────────────────────────────
    await queryRunner.dropTable('notifications');
    await queryRunner.dropTable('courses');
    await queryRunner.dropTable('users');
  }
}
