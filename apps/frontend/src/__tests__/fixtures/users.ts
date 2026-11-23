/**
 * User fixtures for testing
 */

export interface TestUser {
  id: string;
  email: string;
  name?: string;
  role: 'student' | 'instructor' | 'admin';
  stellarPublicKey?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const mockStudent: TestUser = {
  id: 'user-1',
  email: 'student@example.com',
  name: 'Test Student',
  role: 'student',
  isVerified: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
};

export const mockInstructor: TestUser = {
  id: 'user-2',
  email: 'instructor@example.com',
  name: 'Test Instructor',
  role: 'instructor',
  stellarPublicKey: 'GABC123INSTRUCTOR456',
  isVerified: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
};

export const mockAdmin: TestUser = {
  id: 'user-3',
  email: 'admin@example.com',
  name: 'Test Admin',
  role: 'admin',
  isVerified: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
};

export const mockUnverifiedUser: TestUser = {
  id: 'user-4',
  email: 'unverified@example.com',
  name: 'Unverified User',
  role: 'student',
  isVerified: false,
  createdAt: '2024-01-20T00:00:00.000Z',
};

export const mockUsers = [mockStudent, mockInstructor, mockAdmin];
