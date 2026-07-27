import { faker } from '@faker-js/faker';
import { User, Course, Enrollment, Progress } from '../entities';

export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      passwordHash: faker.string.alphanumeric(60),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      stellarPublicKey: faker.string.alphanumeric(56),
      role: 'student',
      isVerified: true,
      isBanned: false,
      mfaEnabled: false,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      deletedAt: null,
      ...overrides,
    } as User;
  }

  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createInstructor(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'instructor',
      isVerified: true,
      ...overrides,
    });
  }

  static createAdmin(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'admin',
      isVerified: true,
      ...overrides,
    });
  }
}

export class CourseFactory {
  static create(overrides: Partial<Course> = {}): Course {
    return {
      id: faker.string.uuid(),
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
      level: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']),
      durationHours: faker.number.int({ min: 1, max: 40 }),
      price: faker.number.float({ min: 0, max: 299.99, fractionDigits: 2 }),
      isPublished: true,
      isDeleted: false,
      requiresKyc: false,
      instructorId: faker.string.uuid(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    } as Course;
  }

  static createMany(count: number, overrides: Partial<Course> = {}): Course[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createDraft(overrides: Partial<Course> = {}): Course {
    return this.create({
      isPublished: false,
      ...overrides,
    });
  }

  static createPremium(overrides: Partial<Course> = {}): Course {
    return this.create({
      price: faker.number.float({ min: 99.99, max: 499.99, fractionDigits: 2 }),
      requiresKyc: true,
      ...overrides,
    });
  }
}

export class EnrollmentFactory {
  static create(overrides: Partial<Enrollment> = {}): Enrollment {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      courseId: faker.string.uuid(),
      enrolledAt: faker.date.past(),
      completedAt: faker.helpers.maybe(() => faker.date.recent(), { probability: 0.3 }),
      ...overrides,
    } as Enrollment;
  }

  static createMany(count: number, overrides: Partial<Enrollment> = {}): Enrollment[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createCompleted(overrides: Partial<Enrollment> = {}): Enrollment {
    return this.create({
      completedAt: faker.date.recent(),
      ...overrides,
    });
  }
}

export class ProgressFactory {
  static create(overrides: Partial<Progress> = {}): Progress {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      courseId: faker.string.uuid(),
      lessonId: faker.string.uuid(),
      progressPct: faker.number.int({ min: 0, max: 100 }),
      completedAt: faker.helpers.maybe(() => faker.date.recent(), { probability: 0.7 }),
      txHash: faker.helpers.maybe(() => faker.string.alphanumeric(64), { probability: 0.5 }),
      updatedAt: faker.date.recent(),
      ...overrides,
    } as Progress;
  }

  static createMany(count: number, overrides: Partial<Progress> = {}): Progress[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createCompleted(overrides: Partial<Progress> = {}): Progress {
    return this.create({
      progressPct: 100,
      completedAt: faker.date.recent(),
      txHash: faker.string.alphanumeric(64),
      ...overrides,
    });
  }
}
