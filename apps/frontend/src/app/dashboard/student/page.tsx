'use client';

import { useCallback, useMemo, useState } from 'react';
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
        <DashboardHeader
          username={user?.username}
          email={user?.email}
          isLoading={isLoading}
          suffix="👋"
        />

        <DashboardError message={error} />

        <QuickStats stats={stats} tokenBalance={tokenBalance} isLoading={isLoading} />

        <LearningAnalyticsSection analytics={analytics} isDarkMode={resolvedTheme === 'dark'} />

        <DashboardSection
          title="My Courses"
          ariaLabel="Enrolled courses"
          actions={
            <CourseListControls
              filter={filter}
              sort={sort}
              onFilterChange={setFilter}
              onSortChange={setSort}
            />
          }
        >
          <EnrolledCourseList courses={visibleCourses} isLoading={isLoading} />
        </DashboardSection>

        <DashboardSection title="Badges & Certificates" ariaLabel="Earned credentials">
          <CredentialGrid credentials={credentials} isLoading={isLoading} />
        </DashboardSection>
      </main>
    </ProtectedRoute>
  );
}
