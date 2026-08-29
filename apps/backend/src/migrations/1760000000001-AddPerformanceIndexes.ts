import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * AddPerformanceIndexes — #810 cleanup
 *
 * Removed indexes that are now declared as @Index() decorators on the entity
 * classes (User, Course) and therefore managed automatically by TypeORM
 * (synchronize:true in dev; generated migrations in prod).
 *
 * REMOVED (redundant — covered by @Index on entity):
 *   IDX_USERS_ACTIVE_ROLE           — superseded by @Index(['role','deletedAt']) on User
 *   IDX_USERS_VERIFIED              — superseded by @Index(['isVerified','deletedAt']),
 *                                     but isVerified is not yet on the entity @Index;
 *                                     left as a partial-index candidate below (#810-note-1)
 *   IDX_COURSES_PUBLISHED_LEVEL     — superseded by @Index(['isPublished','isDeleted','level'])
 *   IDX_COURSES_INSTRUCTOR          — superseded by @Index(['instructorId','isDeleted'])
 *
 * KEPT (not covered by entity decorators):
 *   IDX_ENROLLMENTS_USER_PROGRESS   — not on Enrollment entity
 *   IDX_REVIEWS_COURSE_RATING       — not on Review entity
 *   IDX_NOTIFICATIONS_UNREAD        — not on Notification entity
 *   IDX_PROGRESS_COURSE_COMPLETION  — not on Progress entity
 *
 * CHECK CONSTRAINTS kept — they express business rules not expressible via decorators.
 */
export class AddPerformanceIndexes1760000000001 implements MigrationInterface {
  name = 'AddPerformanceIndexes1760000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enrollments table — composite index for student progress lookups.
    // Not covered by an @Index decorator on Enrollment entity.
    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({
        name: 'IDX_ENROLLMENTS_USER_PROGRESS',
        columnNames: ['userId', 'completedAt'],
      })
    );

    // Reviews table — composite index for course rating aggregation.
    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'IDX_REVIEWS_COURSE_RATING',
        columnNames: ['courseId', 'rating', 'createdAt'],
      })
    );

    // Notifications table — composite index for unread notification queries.
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_NOTIFICATIONS_UNREAD',
        columnNames: ['userId', 'isRead', 'createdAt'],
        where: '"isRead" = false',
      })
    );

    // Progress table — composite index for completion-progress tracking.
    await queryRunner.createIndex(
      'progress',
      new TableIndex({
        name: 'IDX_PROGRESS_COURSE_COMPLETION',
        columnNames: ['courseId', 'progressPct', 'updatedAt'],
      })
    );

    // --- Check constraints (not expressible as entity decorators) -----------

    await queryRunner.query(`
      ALTER TABLE progress
      ADD CONSTRAINT check_progress_pct
      CHECK (progressPct >= 0 AND progressPct <= 100)
    `);

    await queryRunner.query(`
      ALTER TABLE reviews
      ADD CONSTRAINT check_rating
      CHECK (rating >= 1 AND rating <= 5)
    `);

    await queryRunner.query(`
      ALTER TABLE courses
      ADD CONSTRAINT check_duration_hours
      CHECK (durationHours >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE courses DROP CONSTRAINT IF EXISTS check_duration_hours');
    await queryRunner.query('ALTER TABLE reviews DROP CONSTRAINT IF EXISTS check_rating');
    await queryRunner.query('ALTER TABLE progress DROP CONSTRAINT IF EXISTS check_progress_pct');

    await queryRunner.dropIndex('progress', 'IDX_PROGRESS_COURSE_COMPLETION');
    await queryRunner.dropIndex('notifications', 'IDX_NOTIFICATIONS_UNREAD');
    await queryRunner.dropIndex('reviews', 'IDX_REVIEWS_COURSE_RATING');
    await queryRunner.dropIndex('enrollments', 'IDX_ENROLLMENTS_USER_PROGRESS');
  }
}
