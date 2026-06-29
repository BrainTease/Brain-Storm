import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddPerformanceIndexes1760000000001 implements MigrationInterface {
  name = 'AddPerformanceIndexes1760000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table - composite index for active user lookups
    await queryRunner.createIndex('users', new TableIndex({
      name: 'IDX_USERS_ACTIVE_ROLE',
      columnNames: ['deletedAt', 'role', 'createdAt'],
      where: '"deletedAt" IS NULL',
    }));

    // Users table - index for verified users
    await queryRunner.createIndex('users', new TableIndex({
      name: 'IDX_USERS_VERIFIED',
      columnNames: ['isVerified', 'deletedAt'],
    }));

    // Courses table - composite index for published courses
    await queryRunner.createIndex('courses', new TableIndex({
      name: 'IDX_COURSES_PUBLISHED_LEVEL',
      columnNames: ['isPublished', 'level', 'createdAt'],
      where: '"isDeleted" = false AND "isPublished" = true',
    }));

    // Courses table - index for instructor's courses
    await queryRunner.createIndex('courses', new TableIndex({
      name: 'IDX_COURSES_INSTRUCTOR',
      columnNames: ['instructorId', 'createdAt'],
      where: '"isDeleted" = false',
    }));

    // Enrollments table - composite index for student progress lookups
    await queryRunner.createIndex('enrollments', new TableIndex({
      name: 'IDX_ENROLLMENTS_USER_PROGRESS',
      columnNames: ['userId', 'completedAt'],
    }));

    // Reviews table - composite index for course rating aggregation
    await queryRunner.createIndex('reviews', new TableIndex({
      name: 'IDX_REVIEWS_COURSE_RATING',
      columnNames: ['courseId', 'rating', 'createdAt'],
    }));

    // Notifications table - composite index for unread notifications
    await queryRunner.createIndex('notifications', new TableIndex({
      name: 'IDX_NOTIFICATIONS_UNREAD',
      columnNames: ['userId', 'isRead', 'createdAt'],
      where: '"isRead" = false',
    }));

    // Progress table - composite index for course completion tracking
    await queryRunner.createIndex('progress', new TableIndex({
      name: 'IDX_PROGRESS_COURSE_COMPLETION',
      columnNames: ['courseId', 'progressPct', 'updatedAt'],
    }));

    // Add check constraints for data integrity
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
    // Drop check constraints
    await queryRunner.query('ALTER TABLE courses DROP CONSTRAINT IF EXISTS check_duration_hours');
    await queryRunner.query('ALTER TABLE reviews DROP CONSTRAINT IF EXISTS check_rating');
    await queryRunner.query('ALTER TABLE progress DROP CONSTRAINT IF EXISTS check_progress_pct');

    // Drop indexes
    await queryRunner.dropIndex('progress', 'IDX_PROGRESS_COURSE_COMPLETION');
    await queryRunner.dropIndex('notifications', 'IDX_NOTIFICATIONS_UNREAD');
    await queryRunner.dropIndex('reviews', 'IDX_REVIEWS_COURSE_RATING');
    await queryRunner.dropIndex('enrollments', 'IDX_ENROLLMENTS_USER_PROGRESS');
    await queryRunner.dropIndex('courses', 'IDX_COURSES_INSTRUCTOR');
    await queryRunner.dropIndex('courses', 'IDX_COURSES_PUBLISHED_LEVEL');
    await queryRunner.dropIndex('users', 'IDX_USERS_VERIFIED');
    await queryRunner.dropIndex('users', 'IDX_USERS_ACTIVE_ROLE');
  }
}