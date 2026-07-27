import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Progress } from '../progress/progress.entity';
import { UserFactory, CourseFactory, EnrollmentFactory, ProgressFactory } from '../test/factories';

@Injectable()
export class TestDataService {
  private readonly logger = new Logger(TestDataService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Progress)
    private progressRepository: Repository<Progress>,
  ) {}

  async seedBasicData(): Promise<void> {
    this.logger.log('Seeding basic test data...');

    // Create users
    const users = UserFactory.createMany(10);
    const instructors = UserFactory.createMany(3, { role: 'instructor' });
    const admin = UserFactory.createAdmin();

    await this.userRepository.save([...users, ...instructors, admin]);
    this.logger.log(`Created ${users.length + instructors.length + 1} users`);

    // Create courses
    const courses = CourseFactory.createMany(5, { instructorId: instructors[0].id });
    const premiumCourses = CourseFactory.createMany(2, { 
      instructorId: instructors[1].id,
      price: 99.99,
      requiresKyc: true 
    });

    await this.courseRepository.save([...courses, ...premiumCourses]);
    this.logger.log(`Created ${courses.length + premiumCourses.length} courses`);

    // Create enrollments
    const enrollments = [];
    users.forEach(user => {
      const userCourses = courses.slice(0, Math.floor(Math.random() * 3) + 1);
      userCourses.forEach(course => {
        enrollments.push(EnrollmentFactory.create({
          userId: user.id,
          courseId: course.id,
        }));
      });
    });

    await this.enrollmentRepository.save(enrollments);
    this.logger.log(`Created ${enrollments.length} enrollments`);

    // Create progress records
    const progressRecords = [];
    enrollments.forEach(enrollment => {
      const progressCount = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < progressCount; i++) {
        progressRecords.push(ProgressFactory.create({
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          progressPct: Math.min(100, (i + 1) * 20 + Math.floor(Math.random() * 20)),
        }));
      }
    });

    await this.progressRepository.save(progressRecords);
    this.logger.log(`Created ${progressRecords.length} progress records`);

    this.logger.log('✅ Basic test data seeding completed');
  }

  async seedPerformanceData(): Promise<void> {
    this.logger.log('Seeding performance test data...');

    // Create large dataset for performance testing
    const users = UserFactory.createMany(1000);
    await this.userRepository.save(users);

    const instructors = UserFactory.createMany(50, { role: 'instructor' });
    await this.userRepository.save(instructors);

    const courses = CourseFactory.createMany(200);
    await this.courseRepository.save(courses);

    this.logger.log('✅ Performance test data seeding completed');
  }

  async cleanupTestData(): Promise<void> {
    this.logger.log('Cleaning up test data...');

    await this.progressRepository.delete({});
    await this.enrollmentRepository.delete({});
    await this.courseRepository.delete({});
    await this.userRepository.delete({});

    this.logger.log('✅ Test data cleanup completed');
  }

  async getTestDataStats(): Promise<any> {
    const userCount = await this.userRepository.count();
    const courseCount = await this.courseRepository.count();
    const enrollmentCount = await this.enrollmentRepository.count();
    const progressCount = await this.progressRepository.count();

    return {
      users: userCount,
      courses: courseCount,
      enrollments: enrollmentCount,
      progress: progressCount,
    };
  }
}
