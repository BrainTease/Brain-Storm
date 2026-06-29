'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { ProgressDataPoint, StreakData, QuizScoreDataPoint } from '@/components/analytics';
import Link from 'next/link';

function ChartFallback() {
  return <div className="h-72 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />;
}

const ProgressOverTimeChart = dynamic(
  () => import('@/components/analytics/ProgressOverTimeChart').then((m) => ({ default: m.ProgressOverTimeChart })),
  { loading: ChartFallback },
);

const StreakHeatmapChart = dynamic(
  () => import('@/components/analytics/StreakHeatmapChart').then((m) => ({ default: m.StreakHeatmapChart })),
  { loading: ChartFallback },
);

const QuizScoreChart = dynamic(
  () => import('@/components/analytics/QuizScoreChart').then((m) => ({ default: m.QuizScoreChart })),
  { loading: ChartFallback },
);


interface ProgressRecord {
  id: string;
  courseId: string;
  progressPct: number;
}

interface CredentialRecord {
  id: string;
  courseId: string;
  issuedAt: string;
  course?: { id: string; title: string };
}

interface CourseData {
  id: string;
  title: string;
  level?: string;
  durationHours?: number;
}

type SortKey = 'progress' | 'title';
type FilterKey = 'all' | 'in-progress' | 'completed';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <span className="text-3xl" aria-hidden="true">{icon}</span>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

/**
 * Helper function to load analytics data from the backend
 * or generate mock data for demonstration
 */
async function loadAnalyticsData(
  userId: string,
  progressRecords: ProgressRecord[],
  setProgressOverTimeData: (data: ProgressDataPoint[]) => void,
  setStreakData: (data: StreakData[]) => void,
  setQuizScoreData: (data: QuizScoreDataPoint[]) => void,
  setChartDataLoading: (loading: boolean) => void,
) {
  try {
    setChartDataLoading(true);

    // Try to fetch analytics data from API
    try {
      const analyticsRes = await api.get(`/users/${userId}/analytics`);
      if (analyticsRes.data) {
        const analytics = analyticsRes.data;

        // Process progress over time
        if (analytics.progressHistory) {
          setProgressOverTimeData(analytics.progressHistory);
        } else {
          generateMockProgressData(setProgressOverTimeData);
        }

        // Process streak data
        if (analytics.streakHistory) {
          setStreakData(analytics.streakHistory);
        } else {
          generateMockStreakData(setStreakData);
        }

        // Process quiz scores
        if (analytics.quizScores) {
          setQuizScoreData(analytics.quizScores);
        } else {
          generateMockQuizData(setQuizScoreData);
        }
      }
    } catch {
      // API endpoint not available, generate mock data
      generateMockProgressData(setProgressOverTimeData);
      generateMockStreakData(setStreakData);
      generateMockQuizData(setQuizScoreData);
    }
  } finally {
    setChartDataLoading(false);
  }
}

/**
 * Generate mock progress data for demonstration
 */
function generateMockProgressData(setData: (data: ProgressDataPoint[]) => void) {
  const data: ProgressDataPoint[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const progress = Math.max(0, Math.min(100, 30 + i * 2.5 + Math.random() * 10));

    data.push({
      date: dateStr,
      progress,
      courseName: 'Overall Progress',
    });
  }

  setData(data);
}

/**
 * Generate mock streak heatmap data
 */
function generateMockStreakData(setData: (data: StreakData[]) => void) {
  const data: StreakData[] = [];
  const today = new Date();

  for (let i = 0; i < 84; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const weekNumber = Math.floor(i / 7);
    const dayOfWeek = 6 - (i % 7);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = Math.random() > 0.4 ? Math.floor(Math.random() * 5) + 1 : 0;

    data.push({
      date: dateStr,
      count,
      weekNumber,
      dayOfWeek,
    });
  }

  setData(data.reverse());
}

/**
 * Generate mock quiz score data
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


export default function StudentDashboardPage() {
  const { state } = useAuth();
  const { resolvedTheme } = useTheme();
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [courses, setCourses] = useState<Record<string, CourseData>>({});
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('progress');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [chartDataLoading, setChartDataLoading] = useState(true);
  const [progressOverTimeData, setProgressOverTimeData] = useState<ProgressDataPoint[]>([]);
  const [streakData, setStreakData] = useState<StreakData[]>([]);
  const [quizScoreData, setQuizScoreData] = useState<QuizScoreDataPoint[]>([]);

  const userId = state.user?.id;
  const isDarkMode = resolvedTheme === 'dark';

  useEffect(() => {
    if (state.isLoading || !userId) return;

    async function load() {
      try {
        const [balRes, progRes, credRes] = await Promise.all([
          api.get(`/users/${userId}/token-balance`),
          api.get(`/users/${userId}/progress`),
          api.get(`/credentials/${userId}`),
        ]);

        setTokenBalance(Number(balRes.data.balance ?? 0));

        const progressRecords: ProgressRecord[] = (progRes.data ?? []).map((p: any) => ({
          id: p.id,
          courseId: p.courseId,
          progressPct: p.progressPct ?? 0,
        }));
        setProgress(progressRecords);

        setCredentials(
          ((credRes.data ?? []) as any[]).map((c) => ({
            id: c.id,
            courseId: c.courseId,
            issuedAt: c.issuedAt ?? c.createdAt ?? '',
            course: c.course ? { id: c.course.id, title: c.course.title } : undefined,
          }))
        );

        const ids = Array.from(new Set(progressRecords.map((p) => p.courseId)));
        const map: Record<string, CourseData> = {};
        await Promise.all(
          ids.map(async (id) => {
            try {
              const { data } = await api.get(`/courses/${id}`);
              const c = data?.data ?? data;
              if (c) map[c.id] = { id: c.id, title: c.title, level: c.level, durationHours: c.durationHours };
            } catch { /* ignore */ }
          })
        );
        setCourses(map);

        // Load analytics data
        loadAnalyticsData(
          userId,
          progressRecords,
          setProgressOverTimeData,
          setStreakData,
          setQuizScoreData,
          setChartDataLoading,
        );
      } catch {
        setError('Failed to load dashboard. Please refresh.');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [state.isLoading, userId]);

  // Real-time progress updates via WebSocket (lazy loaded)
  useEffect(() => {
    if (!userId) return;
    let socket: Awaited<ReturnType<typeof import('socket.io-client')['io']>>;

    import('socket.io-client').then(({ io }) => {
      socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
        auth: { token: state.token },
        transports: ['websocket'],
      });

      socket.on(`progress:${userId}`, (update: { courseId: string; progressPct: number }) => {
        setProgress((prev) =>
          prev.map((p) =>
            p.courseId === update.courseId ? { ...p, progressPct: update.progressPct } : p
          )
        );
      });
    });

    return () => { socket?.disconnect(); };
  }, [userId, state.token]);

  const enrolledCourses = useMemo(() => {
    return progress.map((r) => ({
      ...r,
      title: courses[r.courseId]?.title ?? `Course ${r.courseId}`,
      level: courses[r.courseId]?.level,
      durationHours: courses[r.courseId]?.durationHours,
    }));
  }, [progress, courses]);

  const filteredCourses = useMemo(() => {
    let list = enrolledCourses;
    if (filter === 'in-progress') list = list.filter((c) => c.progressPct > 0 && c.progressPct < 100);
    if (filter === 'completed') list = list.filter((c) => c.progressPct === 100);
    if (sort === 'progress') list = [...list].sort((a, b) => b.progressPct - a.progressPct);
    if (sort === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [enrolledCourses, filter, sort]);

  const stats = useMemo(() => ({
    completed: enrolledCourses.filter((c) => c.progressPct === 100).length,
    inProgress: enrolledCourses.filter((c) => c.progressPct > 0 && c.progressPct < 100).length,
    totalHours: enrolledCourses.reduce((acc, c) => acc + (c.durationHours ?? 0), 0),
    badges: credentials.length,
  }), [enrolledCourses, credentials]);

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
        <section aria-label="Learning analytics">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Learning Analytics
          </h2>
          <div className="space-y-6">
            <ProgressOverTimeChart
              data={progressOverTimeData}
              isLoading={chartDataLoading}
              isDarkMode={isDarkMode}
              title="Learning Progress Over Time (30 days)"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StreakHeatmapChart
                data={streakData}
                isLoading={chartDataLoading}
                isDarkMode={isDarkMode}
                title="Learning Streak Heatmap (12 weeks)"
              />
              <QuizScoreChart
                data={quizScoreData}
                isLoading={chartDataLoading}
                isDarkMode={isDarkMode}
                title="Quiz Performance"
              />
            </div>
          </div>
        </section>

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
