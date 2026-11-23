/**
 * Admin fixtures for testing
 */

export interface TestPlatformStats {
  totalUsers: number;
  totalCourses: number;
  totalRevenue: number;
}

export interface TestActivityEvent {
  id: string;
  type: 'enrollment' | 'completion' | 'new_user';
  description: string;
  createdAt: string;
}

export interface TestAdminUser {
  id: string;
  displayName: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  status: 'active' | 'banned';
}

export interface TestPendingCourse {
  id: string;
  title: string;
  instructorName: string;
  submittedAt: string;
}

export interface TestHealthStatus {
  api: 'ok' | 'degraded' | 'down';
  database: 'ok' | 'degraded' | 'down';
  stellar: 'ok' | 'degraded' | 'down';
}

export const mockPlatformStats: TestPlatformStats = {
  totalUsers: 1250,
  totalCourses: 48,
  totalRevenue: 125000,
};

export const mockActivityEvents: TestActivityEvent[] = [
  {
    id: 'event-1',
    type: 'enrollment',
    description: 'Student enrolled in Blockchain Basics',
    createdAt: '2024-01-20T10:30:00.000Z',
  },
  {
    id: 'event-2',
    type: 'completion',
    description: 'Student completed Smart Contracts on Stellar',
    createdAt: '2024-01-20T09:15:00.000Z',
  },
  {
    id: 'event-3',
    type: 'new_user',
    description: 'New user registered: john@example.com',
    createdAt: '2024-01-20T08:00:00.000Z',
  },
];

export const mockAdminUsers: TestAdminUser[] = [
  {
    id: 'user-1',
    displayName: 'Test Student',
    email: 'student@example.com',
    role: 'student',
    status: 'active',
  },
  {
    id: 'user-2',
    displayName: 'Test Instructor',
    email: 'instructor@example.com',
    role: 'instructor',
    status: 'active',
  },
];

export const mockPendingCourses: TestPendingCourse[] = [
  {
    id: 'course-pending-1',
    title: 'Introduction to DeFi',
    instructorName: 'Jane Doe',
    submittedAt: '2024-01-18T00:00:00.000Z',
  },
];

export const mockHealthStatus: TestHealthStatus = {
  api: 'ok',
  database: 'ok',
  stellar: 'ok',
};

export const mockDegradedHealthStatus: TestHealthStatus = {
  api: 'ok',
  database: 'degraded',
  stellar: 'ok',
};
