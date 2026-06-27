import { faker } from '@faker-js/faker';

export class UserFactory {
  static create(overrides?: Partial<any>) {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      password: faker.internet.password(),
      role: 'student',
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<any>) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

export class CourseFactory {
  static create(overrides?: Partial<any>) {
    return {
      id: faker.string.uuid(),
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
      instructorId: faker.string.uuid(),
      status: 'published',
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<any>) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

export class EnrollmentFactory {
  static create(overrides?: Partial<any>) {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      courseId: faker.string.uuid(),
      status: 'active',
      progress: faker.number.int({ min: 0, max: 100 }),
      enrolledAt: faker.date.past(),
      completedAt: null,
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<any>) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

export class QuizFactory {
  static create(overrides?: Partial<any>) {
    return {
      id: faker.string.uuid(),
      courseId: faker.string.uuid(),
      title: faker.lorem.words(2),
      questions: faker.number.int({ min: 5, max: 20 }),
      passingScore: 70,
      createdAt: faker.date.past(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<any>) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
