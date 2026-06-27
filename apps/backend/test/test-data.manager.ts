import { DataSource } from 'typeorm';

export class TestDataManager {
  constructor(private dataSource: DataSource) {}

  async seedDatabase() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Seed users
      await queryRunner.query(`
        INSERT INTO "user" (id, email, name, role, "createdAt", "updatedAt")
        VALUES 
          ('user-1', 'student@test.com', 'Test Student', 'student', NOW(), NOW()),
          ('user-2', 'instructor@test.com', 'Test Instructor', 'instructor', NOW(), NOW()),
          ('user-3', 'admin@test.com', 'Test Admin', 'admin', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `);

      // Seed courses
      await queryRunner.query(`
        INSERT INTO "course" (id, title, description, "instructorId", status, "createdAt", "updatedAt")
        VALUES 
          ('course-1', 'Blockchain Basics', 'Learn blockchain fundamentals', 'user-2', 'published', NOW(), NOW()),
          ('course-2', 'Smart Contracts', 'Master smart contract development', 'user-2', 'published', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `);

      // Seed enrollments
      await queryRunner.query(`
        INSERT INTO "enrollment" (id, "userId", "courseId", status, progress, "enrolledAt")
        VALUES 
          ('enrollment-1', 'user-1', 'course-1', 'active', 50, NOW()),
          ('enrollment-2', 'user-1', 'course-2', 'active', 25, NOW())
        ON CONFLICT DO NOTHING
      `);
    } finally {
      await queryRunner.release();
    }
  }

  async cleanDatabase() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query('DELETE FROM "enrollment"');
      await queryRunner.query('DELETE FROM "course"');
      await queryRunner.query('DELETE FROM "user"');
    } finally {
      await queryRunner.release();
    }
  }

  async resetSequences() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const tables = ['user', 'course', 'enrollment', 'quiz'];
      for (const table of tables) {
        await queryRunner.query(`ALTER SEQUENCE "${table}_id_seq" RESTART WITH 1`).catch(() => {});
      }
    } finally {
      await queryRunner.release();
    }
  }
}
