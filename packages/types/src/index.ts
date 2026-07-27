export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'instructor' | 'student';
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  status: 'active' | 'completed' | 'dropped';
  enrolledAt: Date;
  completedAt?: Date;
}

export interface Credential {
  id: string;
  userId: string;
  courseId: string;
  issueDate: Date;
  transactionHash: string;
}

export type UserRole = User['role'];
export type EnrollmentStatus = Enrollment['status'];

export * from './api.types';
export * from './auth.types';
export * from './common.types';
export * from './course.types';
export * from './dto.types';
export * from './enrollment.types';
export * from './error.types';
export * from './exercise.types';
export * from './notification.types';
export * from './progress.types';
export * from './quiz.types';
export * from './stellar.types';
export * from './user.types';
export * from './validation.types';
