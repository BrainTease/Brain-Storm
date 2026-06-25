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

export * from './exercise.types';
