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

/** Sort/filter state for the dashboard course list. */
export interface DashboardCourseState {
  sortKey: CourseSortKey;
  filterKey: CourseFilterKey;
  searchQuery: string;
}

/** Generic API envelope used by dashboard data fetchers. */
export interface ApiResponse<T> {
  data: T;
  error?: string | null;
}

/** Payload returned by the dashboard summary endpoint. */
export interface DashboardSummaryPayload {
  user: DashboardUser;
  stats: DashboardStats;
  courses: EnrolledCourse[];
  credentials: CredentialRecord[];
}

/** Payload returned by the dashboard courses endpoint. */
export interface DashboardCoursesPayload {
  courses: EnrolledCourse[];
  total: number;
}

/** Payload returned by the dashboard credentials endpoint. */
export interface DashboardCredentialsPayload {
  credentials: CredentialRecord[];
  total: number;
}

/** Nullable wrapper for data that may not be loaded yet. */
export type Maybe<T> = T | null;

/** Result of an async dashboard data fetch. */
export type DashboardFetchResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }
  | { status: 'loading' };
