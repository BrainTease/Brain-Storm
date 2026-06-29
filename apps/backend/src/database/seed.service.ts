import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';
import { CourseModule } from '../courses/course-module.entity';
import { Lesson } from '../courses/lesson.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Progress } from '../progress/progress.entity';
import { Review } from '../courses/review.entity';
import { Notification } from '../notifications/notification.entity';
import { NotificationType } from '../notifications/notification.entity';

interface SeedOptions {
  includeReviews?: boolean;
  includeTips?: boolean;
  count?: number;
}

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  // Realistic names for generating demo data
  private readonly firstNames = [
    'Alice', 'Bob', 'Charlie', 'Diana', 'Eve',
    'Frank', 'Grace', 'Hank', 'Ivy', 'Jack',
    'Kara', 'Leo', 'Mona', 'Nate', 'Olive',
    'Pete', 'Quinn', 'Rosa', 'Sam', 'Tina',
  ];

  private readonly lastNames = [
    'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
    'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez',
    'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
  ];

  private readonly courseTitles = [
    'Introduction to Blockchain Development',
    'Advanced Smart Contracts with Soroban',
    'Full-Stack Web Development with Next.js',
    'Machine Learning Fundamentals',
    'Cloud Architecture on AWS',
    'Data Structures & Algorithms',
    'Cybersecurity Essentials',
    'Mobile Development with React Native',
    'DevOps & CI/CD Pipeline Mastery',
    'Database Design & Optimization',
  ];

  private readonly courseDescriptions = [
    'Learn the fundamentals of blockchain technology, consensus mechanisms, and how to build decentralized applications from scratch.',
    'Dive deep into Soroban smart contract development, covering advanced patterns, optimization techniques, and real-world deployment strategies.',
    'Build modern web applications using Next.js 14, TypeScript, and the latest React patterns including Server Components and App Router.',
    'Explore machine learning concepts from linear regression to neural networks, with hands-on projects using Python and TensorFlow.',
    'Master cloud architecture patterns on AWS, including serverless computing, microservices, and infrastructure as code.',
    'A comprehensive course covering essential data structures and algorithms with practical implementations in TypeScript.',
    'Learn cybersecurity fundamentals including network security, cryptography, threat modeling, and incident response.',
    'Build cross-platform mobile applications using React Native, covering navigation, state management, and native module integration.',
    'Master DevOps practices including CI/CD pipelines, containerization, infrastructure automation, and monitoring.',
    'Learn database design principles, query optimization, indexing strategies, and best practices for data modeling.',
  ];

  private readonly categoryNames = [
    'Blockchain',
    'Web Development',
    'Data Science',
    'Cloud Computing',
    'Mobile Development',
    'Security',
    'DevOps',
    'Database',
  ];

  private readonly reviewComments = [
    'Excellent course! The material was well-structured and easy to follow.',
    'Great content, but could use more hands-on exercises.',
    'Perfect for beginners. The instructor explained complex topics clearly.',
    'Very comprehensive. I learned a lot and can apply it immediately.',
    'Good course overall, but some sections felt rushed.',
    'Outstanding! One of the best online courses I have taken.',
    'Decent introduction, but lacks depth in advanced topics.',
    'The projects were extremely helpful for understanding real-world applications.',
    'Clear and concise. Every concept was explained with practical examples.',
    'Highly recommended for anyone looking to break into this field.',
  ];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseModule)
    private readonly moduleRepository: Repository<CourseModule>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Progress)
    private readonly progressRepository: Repository<Progress>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async seed(options: SeedOptions = {}): Promise<void> {
    const count = options.count || 10;
    const includeReviews = options.includeReviews ?? false;
    const includeTips = options.includeTips ?? false;

    // Clean existing data (idempotent — safe to re-run)
    await this.cleanup();

    // 1. Create users (students, instructors, curators)
    const { students, instructors, curators, admin } = await this.seedUsers(count);

    // 2. Create categories and courses
    const courses = await this.seedCourses(instructors, count);

    // 3. Create course modules and lessons
    const { modules, lessons } = await this.seedModulesAndLessons(courses);

    // 4. Create enrollments
    const enrollments = await this.seedEnrollments(students, courses);

    // 5. Create progress records
    await this.seedProgress(enrollments, lessons);

    // 6. Create notifications
    await this.seedNotifications(enrollments);

    // 7. Optionally create reviews
    if (includeReviews) {
      await this.seedReviews(students, courses);
    }

    // 8. Optionally create sample tips/tx data
    if (includeTips) {
      await this.seedSampleTransactions(students, instructors);
    }

    // Log summary
    await this.logSummary();
  }

  private async cleanup(): Promise<void> {
    this.logger.log('Cleaning existing seed data...');
    await this.notificationRepository.delete({});
    await this.reviewRepository.delete({});
    await this.progressRepository.delete({});
    await this.enrollmentRepository.delete({});
    await this.lessonRepository.delete({});
    await this.moduleRepository.delete({});
    await this.courseRepository.delete({});
    await this.userRepository.delete({});
    this.logger.log('Cleanup complete.');
  }

  private async seedUsers(count: number) {
    this.logger.log('Seeding users...');

    // Create admin
    const admin = this.userRepository.create({
      email: 'admin@brainstorm.dev',
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'admin',
      isVerified: true,
      bio: 'Platform administrator',
    });
    await this.userRepository.save(admin);

    // Create instructors
    const instructors: User[] = [];
    for (let i = 0; i < Math.min(5, count); i++) {
      const instructor = this.userRepository.create({
        email: `instructor${i + 1}@brainstorm.dev`,
        username: `instructor_${this.firstNames[i].toLowerCase()}`,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'instructor',
        isVerified: true,
        bio: `Experienced instructor specializing in ${this.courseTitles[i]}`,
        stellarPublicKey: `G${Array.from({ length: 55 }, () => 
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
        ).join('')}`,
      });
      instructors.push(instructor);
    }
    await this.userRepository.save(instructors);

    // Create curators (moderators with content curation role)
    const curators: User[] = [];
    for (let i = 0; i < Math.min(3, count); i++) {
      const curator = this.userRepository.create({
        email: `curator${i + 1}@brainstorm.dev`,
        username: `curator_${this.firstNames[i + 5].toLowerCase()}`,
        passwordHash: await bcrypt.hash('curator123', 10),
        role: 'admin',
        isVerified: true,
        bio: `Content curator ensuring quality across the platform`,
      });
      curators.push(curator);
    }
    await this.userRepository.save(curators);

    // Create students
    const students: User[] = [];
    for (let i = 0; i < count * 2; i++) {
      const firstName = this.firstNames[i % this.firstNames.length];
      const lastName = this.lastNames[Math.floor(i / this.firstNames.length) % this.lastNames.length];
      const student = this.userRepository.create({
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
        passwordHash: await bcrypt.hash('student123', 10),
        role: 'student',
        isVerified: Math.random() > 0.2,
        bio: Math.random() > 0.5 ? `Student passionate about learning new technologies.` : null,
        stellarPublicKey: Math.random() > 0.3
          ? `G${Array.from({ length: 55 }, () =>
              'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
            ).join('')}`
          : null,
      });
      students.push(student);
    }
    await this.userRepository.save(students);

    this.logger.log(`Created ${students.length} students, ${instructors.length} instructors, ${curators.length} curators, and admin`);

    return { students, instructors, curators, admin };
  }

  private async seedCourses(instructors: User[], count: number) {
    this.logger.log('Seeding courses...');

    const courses: Course[] = [];

    for (let i = 0; i < Math.min(count, this.courseTitles.length); i++) {
      const instructor = instructors[i % instructors.length];
      const course = this.courseRepository.create({
        title: this.courseTitles[i],
        description: this.courseDescriptions[i],
        level: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)],
        durationHours: Math.floor(Math.random() * 40) + 10,
        isPublished: true,
        isDeleted: false,
        requiresKyc: Math.random() > 0.8,
        instructorId: instructor.id,
      });
      courses.push(course);
    }

    await this.courseRepository.save(courses);
    this.logger.log(`Created ${courses.length} courses`);

    return courses;
  }

  private async seedModulesAndLessons(courses: Course[]) {
    this.logger.log('Seeding modules and lessons...');

    const allModules: CourseModule[] = [];
    const allLessons: Lesson[] = [];

    for (const course of courses) {
      const moduleCount = Math.floor(Math.random() * 4) + 3; // 3-6 modules per course

      for (let m = 0; m < moduleCount; m++) {
        const courseModule = this.moduleRepository.create({
          courseId: course.id,
          title: `Module ${m + 1}: ${['Introduction', 'Core Concepts', 'Advanced Topics', 'Practical Applications', 'Best Practices', 'Final Project'][m] || `Topic ${m + 1}`}`,
          order: m + 1,
        });
        allModules.push(courseModule);
      }
    }

    await this.moduleRepository.save(allModules);

    // Create lessons for each module
    for (const mod of allModules) {
      const lessonCount = Math.floor(Math.random() * 3) + 2; // 2-4 lessons per module

      const lessonTitles = ['Overview', 'Deep Dive', 'Hands-On Exercise', 'Review & Quiz'];
      for (let l = 0; l < lessonCount; l++) {
        const titleSuffix = lessonTitles[l] || 'Section ' + (l + 1);
        const lessonContent = '# ' + titleSuffix + '\n\n' +
          'This is the content for lesson ' + (l + 1) + ' of ' + mod.title + '. ' +
          'It covers important concepts and provides practical examples.\n\n' +
          '## Key Points\n\n' +
          '- Concept 1 explained with examples\n' +
          '- Concept 2 with practical applications\n' +
          '- Concept 3 building on previous knowledge\n\n' +
          '## Code Example\n\n' +
          '```typescript\n' +
          "const example = 'Hello, Brain-Storm!';\n" +
          'console.log(example);\n' +
          '```\n\n' +
          '## Summary\n\n' +
          'In this lesson, we covered the fundamental concepts needed to progress to the next module.';

        const lesson = this.lessonRepository.create({
          moduleId: mod.id,
          title: 'Lesson ' + (l + 1) + ': ' + titleSuffix,
          content: lessonContent,
          order: l + 1,
          durationMinutes: Math.floor(Math.random() * 20) + 10,
        });
        allLessons.push(lesson);
      }
    }

    await this.lessonRepository.save(allLessons);
    this.logger.log(`Created ${allModules.length} modules and ${allLessons.length} lessons`);

    return { modules: allModules, lessons: allLessons };
  }

  private async seedEnrollments(students: User[], courses: Course[]) {
    this.logger.log('Seeding enrollments...');

    const enrollments: Enrollment[] = [];
    const enrollmentSet = new Set<string>();

    for (const student of students) {
      const courseCount = Math.floor(Math.random() * Math.min(4, courses.length)) + 1;

      for (let i = 0; i < courseCount; i++) {
        const course = courses[Math.floor(Math.random() * courses.length)];
        const key = `${student.id}:${course.id}`;

        if (!enrollmentSet.has(key)) {
          enrollmentSet.add(key);
          const enrollment = this.enrollmentRepository.create({
            userId: student.id,
            courseId: course.id,
            enrolledAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
            completedAt: Math.random() > 0.7 ? new Date() : null,
          });
          enrollments.push(enrollment);
        }
      }
    }

    await this.enrollmentRepository.save(enrollments);
    this.logger.log(`Created ${enrollments.length} enrollments`);

    return enrollments;
  }

  private async seedProgress(enrollments: Enrollment[], lessons: Lesson[]) {
    this.logger.log('Seeding progress records...');

    const progressRecords: Progress[] = [];
    const lessonMap = new Map<string, Lesson[]>();

    for (const lesson of lessons) {
      const key = lesson.moduleId;
      if (!lessonMap.has(key)) {
        lessonMap.set(key, []);
      }
      lessonMap.get(key)!.push(lesson);
    }

    for (const enrollment of enrollments) {
      // Create progress for lessons in this course's modules
      const progressCount = Math.floor(Math.random() * 5) + 1;

      for (let i = 0; i < progressCount; i++) {
        const randomLesson = lessons[Math.floor(Math.random() * lessons.length)];
        const progress = this.progressRepository.create({
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          lessonId: randomLesson.id,
          progressPct: Math.min(100, (i + 1) * 20 + Math.floor(Math.random() * 20)),
          completedAt: Math.random() > 0.6 ? new Date() : null,
          txHash: Math.random() > 0.5
            ? `0x${Array.from({ length: 64 }, () =>
                '0123456789abcdef'[Math.floor(Math.random() * 16)]
              ).join('')}`
            : null,
        });
        progressRecords.push(progress);
      }
    }

    await this.progressRepository.save(progressRecords);
    this.logger.log(`Created ${progressRecords.length} progress records`);
  }

  private async seedReviews(students: User[], courses: Course[]) {
    this.logger.log('Seeding reviews...');

    const reviews: Review[] = [];
    const reviewSet = new Set<string>();

    for (const student of students) {
      if (Math.random() > 0.6) continue; // ~40% of students leave reviews

      const reviewCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < reviewCount; i++) {
        const course = courses[Math.floor(Math.random() * courses.length)];
        const key = `${student.id}:${course.id}`;

        if (!reviewSet.has(key)) {
          reviewSet.add(key);
          const rating = Math.floor(Math.random() * 5) + 1;
          const review = this.reviewRepository.create({
            userId: student.id,
            courseId: course.id,
            rating,
            comment: rating >= 4
              ? this.reviewComments[Math.floor(Math.random() * this.reviewComments.length)]
              : rating === 3
                ? 'Decent course, but there is room for improvement in the advanced sections.'
                : 'The course did not meet my expectations. The content needs updating.',
          });
          reviews.push(review);
        }
      }
    }

    await this.reviewRepository.save(reviews);
    this.logger.log(`Created ${reviews.length} reviews`);
  }

  private async seedNotifications(enrollments: Enrollment[]) {
    this.logger.log('Seeding notifications...');

    const notifications: Notification[] = [];

    for (const enrollment of enrollments.slice(0, 50)) { // Limit to 50 notifications
      if (Math.random() > 0.5) continue;

      const notification = this.notificationRepository.create({
        userId: enrollment.userId,
        type: NotificationType.ENROLLMENT,
        message: `You have been enrolled in a new course. Start learning today!`,
        isRead: Math.random() > 0.5,
      });
      notifications.push(notification);
    }

    await this.notificationRepository.save(notifications);
    this.logger.log(`Created ${notifications.length} notifications`);
  }

  private async seedSampleTransactions(students: User[], instructors: User[]) {
    this.logger.log('Seeding sample transactions (tips)...');

    // Simulating tip transactions between students and instructors
    const tips: Partial<Notification>[] = [];

    for (const student of students.slice(0, 20)) {
      if (Math.random() > 0.5) continue;

      const instructor = instructors[Math.floor(Math.random() * instructors.length)];

      const tip = {
        userId: instructor.id,
        type: NotificationType.CREDENTIAL_ISSUED,
        message: `You received a tip of ${(Math.random() * 50 + 5).toFixed(2)} BST from ${student.username} for excellent teaching!`,
        isRead: false,
      };
      tips.push(tip);
    }

    await this.notificationRepository.save(tips);
    this.logger.log(`Created ${tips.length} sample tip notifications`);
  }

  private async logSummary(): Promise<void> {
    const summary = {
      users: await this.userRepository.count(),
      courses: await this.courseRepository.count(),
      modules: await this.moduleRepository.count(),
      lessons: await this.lessonRepository.count(),
      enrollments: await this.enrollmentRepository.count(),
      progress: await this.progressRepository.count(),
      reviews: await this.reviewRepository.count(),
      notifications: await this.notificationRepository.count(),
    };

    this.logger.log('📊 Seed Summary:');
    Object.entries(summary).forEach(([key, value]) => {
      this.logger.log(`  ${key}: ${value}`);
    });
  }
}