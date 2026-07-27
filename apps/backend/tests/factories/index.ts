import { faker } from '@faker-js/faker';

export class UserFactory {
  static create(overrides = {}) {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      username: faker.internet.username(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: 'student',
      createdAt: faker.date.past(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

export class CourseFactory {
  static create(overrides = {}) {
    return {
      id: faker.string.uuid(),
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
      instructor: faker.person.fullName(),
      duration: faker.number.int({ min: 1, max: 12 }),
      published: true,
      createdAt: faker.date.past(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

export class EnrollmentFactory {
  static create(overrides = {}) {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      courseId: faker.string.uuid(),
      progress: faker.number.int({ min: 0, max: 100 }),
      status: 'active',
      enrolledAt: faker.date.past(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
