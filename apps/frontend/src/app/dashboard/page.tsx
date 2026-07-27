'use client';

import { useMemo } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  CourseProgressList,
  DashboardError,
  DashboardHeader,
  DashboardSection,
  RecentCredentialList,
  TokenBalanceCard,
} from '@/components/dashboard';
import { useDashboardData } from '@/hooks/useDashboardData';

const RECENT_CREDENTIAL_COUNT = 5;

/**
 * Learner dashboard overview.
 *
 * Container component: it owns nothing but the data hook and the composition of
 * the presentational sections under `components/dashboard`.
 */
export default function DashboardPage() {
  const { user, tokenBalance, enrolledCourses, credentials, isLoading, error } =
    useDashboardData();

  const recentCredentials = useMemo(
    () => credentials.slice(0, RECENT_CREDENTIAL_COUNT),
    [credentials]
  );

  return (
    <ProtectedRoute>
      <main className="max-w-5xl mx-auto p-8 space-y-8">
        <section>
          <DashboardHeader
            username={user?.username}
            email={user?.email}
            isLoading={isLoading}
            showEmail
          />
        </section>

        <DashboardError message={error} />

        <TokenBalanceCard balance={tokenBalance} isLoading={isLoading} />

        <DashboardSection title="Enrolled Courses" size="lg" className="mt-3 space-y-4">
          <CourseProgressList courses={enrolledCourses} isLoading={isLoading} />
        </DashboardSection>

        <DashboardSection
          title="Recent Credentials"
          size="lg"
          className="mt-3 space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
        >
          <RecentCredentialList credentials={recentCredentials} isLoading={isLoading} />
        </DashboardSection>
      </main>
    </ProtectedRoute>
  );
}
