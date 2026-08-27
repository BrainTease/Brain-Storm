'use client';

import { useEffect, useMemo, useState, memo } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  CourseListControls,
  CredentialGrid,
  DashboardError,
  DashboardHeader,
  DashboardSection,
  EnrolledCourseList,
  LearningAnalyticsSection,
  QuickStats,
} from '@/components/dashboard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useLearningAnalytics } from '@/hooks/useLearningAnalytics';
import { useProgressSocket, type ProgressUpdate } from '@/hooks/useProgressSocket';
import {
  applyProgressUpdate,
  filterAndSortCourses,
  type CourseFilterKey,
  type CourseSortKey,
} from '@/lib/dashboard';

/**
 * Student dashboard.
 *
 * Container component: composes the dashboard data hook, the analytics hook and
 * the real-time progress socket, then hands plain props to the presentational
 * sections under `components/dashboard`.
 */
function generateMockQuizData(setData: (data: QuizScoreDataPoint[]) => void) {
  const data: QuizScoreDataPoint[] = [];
  const today = new Date();
  const quizNames = ['Module 1 Quiz', 'Module 2 Quiz', 'Module 3 Quiz', 'Module 4 Quiz', 'Module 5 Quiz'];

  for (let i = 0; i < quizNames.length; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i * 5));
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const score = Math.floor(60 + Math.random() * 40);

    data.push({
      date: dateStr,
      score,
      maxScore: 100,
      quizName: quizNames[i],
      attempts: Math.floor(Math.random() * 3) + 1,
    });
  }

  setData(data.reverse());
}

// ─── Memoized AnalyticsSection ────────────────────────────────────────────────
// Extracted so that sort/filter/token state changes in the parent do not
// cause the three heavy chart components to re-render.

interface AnalyticsSectionProps {
  progressData: import('@/components/analytics').ProgressDataPoint[];
  streakData: import('@/components/analytics').StreakData[];
  quizData: import('@/components/analytics').QuizScoreDataPoint[];
  isDarkMode: boolean;
  isLoading: boolean;
}

const AnalyticsSection = memo(function AnalyticsSection({
  progressData,
  streakData,
  quizData,
  isDarkMode,
  isLoading,
}: AnalyticsSectionProps) {
  return (
    <section aria-label="Learning analytics">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Learning Analytics
      </h2>
      <div className="space-y-6">
        <ProgressOverTimeChart
          data={progressData}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          title="Learning Progress Over Time (30 days)"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StreakHeatmapChart
            data={streakData}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
            title="Learning Streak Heatmap (12 weeks)"
          />
          <QuizScoreChart
            data={quizData}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
            title="Quiz Performance"
          />
        </div>
      </div>
    </section>
  );
});

export default function StudentDashboardPage() {
  const { user: authUser, token } = useAuth();
  const { resolvedTheme } = useTheme();
  const [sort, setSort] = useState<CourseSortKey>('progress');
  const [filter, setFilter] = useState<CourseFilterKey>('all');

  const {
    user,
    tokenBalance,
    enrolledCourses,
    credentials,
    stats,
    isLoading,
    error,
    patchProgress,
  } = useDashboardData();
  const analytics = useLearningAnalytics(authUser?.id);

  const handleProgressUpdate = useCallback(
    (update: ProgressUpdate) => patchProgress((records) => applyProgressUpdate(records, update)),
    [patchProgress]
  );
  useProgressSocket(authUser?.id, token, handleProgressUpdate);

  const visibleCourses = useMemo(
    () => filterAndSortCourses(enrolledCourses, filter, sort),
    [enrolledCourses, filter, sort]
  );

  return (
    <ProtectedRoute>
      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          {isLoading ? (
            <Skeleton className="h-8 w-56" />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Welcome back, {state.user?.username ?? state.user?.email ?? 'Student'} 👋
            </h1>
          )}
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/20">
            {error}
          </div>
        )}

        {/* Quick stats */}
        <section aria-label="Quick stats">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : (
              <>
                <StatCard label="Courses Completed" value={stats.completed} icon="🏆" />
                <StatCard label="In Progress" value={stats.inProgress} icon="📚" />
                <StatCard label="Total Hours" value={`${stats.totalHours}h`} icon="⏱" />
                <StatCard label="BST Tokens" value={tokenBalance ?? 0} icon="🪙" />
              </>
            )}
          </div>
        </section>

        {/* Analytics Charts */}
        <AnalyticsSection
          progressData={progressOverTimeData}
          streakData={streakData}
          quizData={quizScoreData}
          isDarkMode={isDarkMode}
          isLoading={chartDataLoading}
        />

        {/* Enrolled courses */}
        <section aria-label="Enrolled courses">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My Courses</h2>
            <div className="flex gap-2 flex-wrap">
              {/* Filter */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
                {(['all', 'in-progress', 'completed'] as FilterKey[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 capitalize transition-colors ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    aria-pressed={filter === f}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm px-3 py-1.5 text-gray-700 dark:text-gray-300"
                aria-label="Sort courses"
              >
                <option value="progress">Sort: Progress</option>
                <option value="title">Sort: Title</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
              <p>No courses found.</p>
              <Link href="/courses" className="mt-2 inline-block text-blue-600 hover:underline text-sm">
                Browse courses →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredCourses.map((course) => (
                <li
                  key={course.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/courses/${course.courseId}`}
                        className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                      >
                        {course.title}
                      </Link>
                      {course.level && (
                        <Badge className="capitalize text-xs shrink-0">
                          {course.level}
                        </Badge>
                      )}
                    </div>
                    <ProgressBar value={course.progressPct} label={`${course.progressPct}% complete`} />
                  </div>
                  {course.progressPct === 100 && (
                    <span className="text-2xl shrink-0" aria-label="Completed" title="Completed">🏆</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Badges & Certificates */}
        <section aria-label="Earned credentials">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Badges &amp; Certificates
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : credentials.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Complete a course to earn your first certificate.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {credentials.map((cred) => (
                <li
                  key={cred.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
                >
                  <span className="text-2xl" aria-hidden="true">🎓</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {cred.course?.title ?? `Course ${cred.courseId}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(cred.issuedAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </ProtectedRoute>
  );
}
