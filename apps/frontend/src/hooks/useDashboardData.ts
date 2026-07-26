'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  computeStats,
  courseIdsFromProgress,
  joinCourses,
  sortCredentialsByIssuedAt,
  toCredentialRecords,
  toProgressRecords,
  type CourseData,
  type CredentialRecord,
  type DashboardStats,
  type DashboardUser,
  type EnrolledCourse,
  type ProgressRecord,
} from '@/lib/dashboard';

export interface DashboardData {
  user: DashboardUser | null;
  tokenBalance: number | null;
  /** Enrolled courses joined with their course details, in API order. */
  enrolledCourses: EnrolledCourse[];
  /** Credentials, newest first. */
  credentials: CredentialRecord[];
  stats: DashboardStats;
  isLoading: boolean;
  error: string | null;
  /** Applies a progress delta locally, e.g. from a real-time update. */
  patchProgress: (updater: (progress: ProgressRecord[]) => ProgressRecord[]) => void;
}

const LOAD_ERROR = 'Unable to load dashboard information. Please refresh.';

/**
 * Owns all dashboard data loading: resolves the current user, then fetches token
 * balance, progress, credentials and the course details each progress record
 * refers to.
 *
 * This is the container half of the dashboard — presentational components under
 * `components/dashboard` receive its output as props and never call the API.
 */
export function useDashboardData(): DashboardData {
  const { user: authUser, token, isLoading: isAuthLoading } = useAuth();
  const [user, setUser] = useState<DashboardUser | null>(() => toDashboardUser(authUser));
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [courses, setCourses] = useState<Record<string, CourseData>>({});
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep in step with the auth store once it resolves (login, refresh, ...).
  useEffect(() => {
    const next = toDashboardUser(authUser);
    if (next) setUser(next);
  }, [authUser]);

  useEffect(() => {
    if (isAuthLoading) return;
    // Unauthenticated: ProtectedRoute handles the redirect, so don't fetch.
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        let currentUser = toDashboardUser(authUser);

        if (!currentUser) {
          const { data } = await api.get('/users/me');
          currentUser = { id: data.id, username: data.username, email: data.email };
          if (!cancelled) setUser(currentUser);
        }

        if (!currentUser?.id) throw new Error('User information is missing.');

        const [balanceRes, progressRes, credentialsRes] = await Promise.all([
          api.get(`/users/${currentUser.id}/token-balance`),
          api.get(`/users/${currentUser.id}/progress`),
          api.get(`/credentials/${currentUser.id}`),
        ]);

        if (cancelled) return;

        const progressRecords = toProgressRecords(progressRes.data);

        // Published before the course lookup so balance and progress paint as
        // soon as they are known; titles fill in a moment later.
        setTokenBalance(Number(balanceRes.data.balance ?? 0));
        setProgress(progressRecords);
        setCredentials(sortCredentialsByIssuedAt(toCredentialRecords(credentialsRes.data)));

        const courseMap = await fetchCourses(courseIdsFromProgress(progressRecords));
        if (!cancelled) setCourses(courseMap);
      } catch {
        if (!cancelled) setError(LOAD_ERROR);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // `authUser` is intentionally omitted: the effect above already keeps the
    // greeting in step, and re-running the whole fetch on every auth-object
    // identity change would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, token]);

  const enrolledCourses = useMemo(() => joinCourses(progress, courses), [progress, courses]);

  const stats = useMemo(() => computeStats(enrolledCourses, credentials), [
    enrolledCourses,
    credentials,
  ]);

  const patchProgress = useCallback(
    (updater: (records: ProgressRecord[]) => ProgressRecord[]) => setProgress(updater),
    []
  );

  return {
    user,
    tokenBalance,
    enrolledCourses,
    credentials,
    stats,
    isLoading,
    error,
    patchProgress,
  };
}

/** Narrows the auth store's user to the fields the dashboard needs. */
function toDashboardUser(
  authUser: { id: string; username: string; email: string } | null | undefined
): DashboardUser | null {
  if (!authUser) return null;
  return { id: authUser.id, username: authUser.username, email: authUser.email };
}

/**
 * Looks up each course in parallel. A course whose details fail to load is simply
 * absent from the map — {@link joinCourses} falls back to a placeholder title.
 */
async function fetchCourses(courseIds: string[]): Promise<Record<string, CourseData>> {
  const map: Record<string, CourseData> = {};

  await Promise.all(
    courseIds.map(async (courseId) => {
      try {
        const { data } = await api.get(`/courses/${courseId}`);
        const course = data?.data ?? data;
        if (course) {
          map[course.id] = {
            id: course.id,
            title: course.title,
            level: course.level,
            durationHours: course.durationHours,
          };
        }
      } catch {
        // Ignore missing course details.
      }
    })
  );

  return map;
}
