/**
 * Shared fixtures for HTTP integration tests
 * 
 * Provides consistent test data for auth and users endpoint testing.
 */

export interface TestUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'student' | 'instructor' | 'admin';
}

export const testUsers = {
  student: {
    email: 'student@test.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Student',
    role: 'student' as const,
  },
  instructor: {
    email: 'instructor@test.com',
    password: 'TestPassword456!',
    firstName: 'Test',
    lastName: 'Instructor',
    role: 'instructor' as const,
  },
  admin: {
    email: 'admin@test.com',
    password: 'TestPassword789!',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin' as const,
  },
  unverified: {
    email: 'unverified@test.com',
    password: 'TestPassword000!',
    firstName: 'Unverified',
    lastName: 'User',
    role: 'student' as const,
  },
};

export const invalidCredentials = {
  wrongPassword: {
    email: 'student@test.com',
    password: 'WrongPassword123!',
  },
  nonexistentUser: {
    email: 'nonexistent@test.com',
    password: 'TestPassword123!',
  },
  invalidEmail: {
    email: 'not-an-email',
    password: 'TestPassword123!',
  },
  weakPassword: {
    email: 'newuser@test.com',
    password: '123',
  },
  emptyPassword: {
    email: 'test@test.com',
    password: '',
  },
};

export const validRegistrationData = {
  email: 'newuser@test.com',
  password: 'NewUserPass123!',
  firstName: 'New',
  lastName: 'User',
};

export const testProfileUpdates = {
  nameUpdate: {
    firstName: 'Updated',
    lastName: 'Name',
  },
  bioUpdate: {
    bio: 'This is my updated bio',
  },
  fullUpdate: {
    firstName: 'Fully',
    lastName: 'Updated',
    bio: 'Complete profile update',
  },
};

/**
 * Generate unique test email to avoid conflicts
 */
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}@test.com`;
}

/**
 * Generate unique test user data
 */
export function generateTestUser(overrides: Partial<TestUserData> = {}): TestUserData {
  return {
    email: generateTestEmail(),
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'student',
    ...overrides,
  };
}
