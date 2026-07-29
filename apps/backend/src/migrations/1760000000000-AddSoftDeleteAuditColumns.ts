import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * AddSoftDeleteAuditColumns — #810 cleanup
 *
 * This migration adds soft-delete and audit columns to users and courses.
 * Index creation has been removed because every index originally declared
 * here is already expressed as an @Index() decorator on the User / Course
 * entity class, so TypeORM manages those indexes automatically.
 *
 * REMOVED index creates (all duplicates of entity @Index decorators):
 *   IDX_USERS_EMAIL_DELETED_AT          → @Index(['email', 'deletedAt'])    on User
 *   IDX_USERS_ROLE_DELETED_AT           → @Index(['role', 'deletedAt'])     on User
 *   IDX_USERS_CREATED_AT                → @Index(['createdAt'])              on User
 *   IDX_COURSES_PUBLISHED_DELETED_LEVEL → @Index(['isPublished','isDeleted','level']) on Course
 *   IDX_COURSES_INSTRUCTOR_DELETED      → @Index(['instructorId','isDeleted']) on Course
 *   IDX_COURSES_CREATED_AT              → @Index(['createdAt'])              on Course
 *   IDX_COURSES_LEVEL_PUBLISHED_DELETED → @Index(['level','isPublished','isDeleted']) on Course
 */
export class AddSoftDeleteAuditColumns1760000000000 implements MigrationInterface {
  name = 'AddSoftDeleteAuditColumns1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Users: audit columns ──────────────────────────────────────────────

    await queryRunner.addColumn(
      'users',
      new TableColumn({ name: 'createdBy', type: 'varchar', isNullable: true }),
    );
    await queryRunner.addColumn(
      'users',
      new TableColumn({ name: 'updatedBy', type: 'varchar', isNullable: true }),
    );
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'updatedAt',
        type: 'timestamptz',
        isNullable: true,
        default: 'NOW()',
      }),
    );

    // ── Courses: soft-delete + audit columns ──────────────────────────────

    await queryRunner.addColumn(
      'courses',
      new TableColumn({ name: 'deletedAt', type: 'timestamptz', isNullable: true }),
    );
    await queryRunner.addColumn(
      'courses',
      new TableColumn({ name: 'createdBy', type: 'varchar', isNullable: true }),
    );
    await queryRunner.addColumn(
      'courses',
      new TableColumn({ name: 'updatedBy', type: 'varchar', isNullable: true }),
    );
    await queryRunner.addColumn(
      'courses',
      new TableColumn({
        name: 'updatedAt',
        type: 'timestamptz',
        isNullable: true,
        default: 'NOW()',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('courses', 'updatedAt');
    await queryRunner.dropColumn('courses', 'updatedBy');
    await queryRunner.dropColumn('courses', 'createdBy');
    await queryRunner.dropColumn('courses', 'deletedAt');

    await queryRunner.dropColumn('users', 'updatedAt');
    await queryRunner.dropColumn('users', 'updatedBy');
    await queryRunner.dropColumn('users', 'createdBy');
  }
}
