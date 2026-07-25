/** Shared shapes for the learner dashboard. */

export interface DashboardUser {
  id: string;
  username: string;
  email: string;
}

export interface ProgressRecord {
  id: string;
  courseId: string;
  progressPct: number;
}

export interface CredentialRecord {
  id: string;
  courseId: string;
  issuedAt: string;
  course?: { id: string; title: string };
}

export interface CourseData {
  id: string;
  title: string;
  level?: string;
  durationHours?: number;
}

/** A progress record joined with the details of the course it belongs to. */
export interface EnrolledCourse extends ProgressRecord {
  title: string;
  level?: string;
  durationHours?: number;
}

export interface DashboardStats {
  completed: number;
  inProgress: number;
  totalHours: number;
  badges: number;
}

export type CourseSortKey = 'progress' | 'title';

export type CourseFilterKey = 'all' | 'in-progress' | 'completed';
