export interface ProgressDto {
  userId: string;
  courseId: string;
  lessonId: string;
  progressPct: number;
  timeSpent?: number;
  completedAt?: Date;
}

export interface ProgressResponse {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  progressPct: number;
  completedAt?: Date;
  txHash?: string;
  updatedAt: Date;
}

export interface CourseProgressSummary {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  overallProgress: number;
  timeSpent: number;
  lastAccessedAt: Date;
  estimatedTimeRemaining: number;
}

export interface StudentProgressStats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalTimeSpent: number;
  averageProgress: number;
  streakDays: number;
  certificatesEarned: number;
}

export interface ProgressMilestone {
  id: string;
  courseId: string;
  percentage: number;
  title: string;
  description: string;
  rewardTokens: number;
  achievedAt?: Date;
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  courses: string[];
  totalDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  progress: number;
}

export interface StudySession {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  completed: boolean;
}
