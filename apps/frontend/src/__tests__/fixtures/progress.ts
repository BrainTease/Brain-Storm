/**
 * Progress fixtures for testing
 */

export interface TestProgress {
  id: string;
  userId: string;
  courseId: string;
  courseTitle?: string;
  progressPct: number;
  lastAccessedAt: string;
  completedAt?: string;
}

export const mockInProgressCourse: TestProgress = {
  id: 'progress-1',
  userId: 'user-1',
  courseId: 'course-1',
  courseTitle: 'Blockchain Basics',
  progressPct: 45,
  lastAccessedAt: '2024-01-20T00:00:00.000Z',
};

export const mockCompletedCourse: TestProgress = {
  id: 'progress-2',
  userId: 'user-1',
  courseId: 'course-2',
  courseTitle: 'Smart Contracts on Stellar',
  progressPct: 100,
  lastAccessedAt: '2024-01-15T00:00:00.000Z',
  completedAt: '2024-01-15T00:00:00.000Z',
};

export const mockJustStartedCourse: TestProgress = {
  id: 'progress-3',
  userId: 'user-1',
  courseId: 'course-3',
  courseTitle: 'Advanced DeFi Protocols',
  progressPct: 5,
  lastAccessedAt: '2024-01-21T00:00:00.000Z',
};

export const mockProgressList = [
  mockInProgressCourse,
  mockCompletedCourse,
  mockJustStartedCourse,
];
