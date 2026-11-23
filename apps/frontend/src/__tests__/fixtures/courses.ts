/**
 * Course fixtures for testing
 */

export interface TestCourse {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  isPublished: boolean;
  requiresKyc: boolean;
  instructorId?: string;
  createdAt: string;
  updatedAt?: string;
}

export const mockBeginnerCourse: TestCourse = {
  id: 'course-1',
  title: 'Blockchain Basics',
  description: 'Learn the fundamentals of blockchain technology',
  level: 'beginner',
  durationHours: 10,
  isPublished: true,
  requiresKyc: false,
  instructorId: 'user-2',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-10T00:00:00.000Z',
};

export const mockIntermediateCourse: TestCourse = {
  id: 'course-2',
  title: 'Smart Contracts on Stellar',
  description: 'Build and deploy smart contracts using Soroban',
  level: 'intermediate',
  durationHours: 20,
  isPublished: true,
  requiresKyc: false,
  instructorId: 'user-2',
  createdAt: '2024-01-05T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
};

export const mockAdvancedCourse: TestCourse = {
  id: 'course-3',
  title: 'Advanced DeFi Protocols',
  description: 'Deep dive into decentralized finance protocols',
  level: 'advanced',
  durationHours: 30,
  isPublished: true,
  requiresKyc: true,
  instructorId: 'user-2',
  createdAt: '2024-01-10T00:00:00.000Z',
  updatedAt: '2024-01-20T00:00:00.000Z',
};

export const mockDraftCourse: TestCourse = {
  id: 'course-4',
  title: 'Draft Course',
  description: 'This course is not published yet',
  level: 'beginner',
  durationHours: 5,
  isPublished: false,
  requiresKyc: false,
  instructorId: 'user-2',
  createdAt: '2024-01-25T00:00:00.000Z',
};

export const mockCourses = [
  mockBeginnerCourse,
  mockIntermediateCourse,
  mockAdvancedCourse,
];
