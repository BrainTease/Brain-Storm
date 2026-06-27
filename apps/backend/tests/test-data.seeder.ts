import { DataSource } from 'typeorm';
import { UserFactory, CourseFactory, EnrollmentFactory } from './factories';

export class TestDataSeeder {
  constructor(private dataSource: DataSource) {}

  async seedUsers(count: number = 10) {
    const users = UserFactory.createMany(count);
    const userRepo = this.dataSource.getRepository('User');
    return userRepo.save(users);
  }

  async seedCourses(count: number = 5) {
    const courses = CourseFactory.createMany(count);
    const courseRepo = this.dataSource.getRepository('Course');
    return courseRepo.save(courses);
  }

  async seedEnrollments(userIds: string[], courseIds: string[]) {
    const enrollments = [];
    for (const userId of userIds) {
      for (const courseId of courseIds) {
        enrollments.push(
          EnrollmentFactory.create({ userId, courseId })
        );
      }
    }
    const enrollmentRepo = this.dataSource.getRepository('Enrollment');
    return enrollmentRepo.save(enrollments);
  }

  async cleanup() {
    const entities = this.dataSource.entityMetadatas;
    for (const entity of entities) {
      const repo = this.dataSource.getRepository(entity.name);
      await repo.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
    }
  }
}
