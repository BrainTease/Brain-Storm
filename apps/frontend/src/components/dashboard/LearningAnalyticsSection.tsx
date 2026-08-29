'use client';

import dynamic from 'next/dynamic';
import type { LearningAnalytics } from '@/hooks/useLearningAnalytics';

function ChartFallback() {
  return <div className="h-72 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />;
}

// Charts pull in recharts, so they load on demand rather than with the page shell.
const ProgressOverTimeChart = dynamic(
  () =>
    import('@/components/analytics/ProgressOverTimeChart').then((m) => ({
      default: m.ProgressOverTimeChart,
    })),
  { loading: ChartFallback }
);

const StreakHeatmapChart = dynamic(
  () =>
    import('@/components/analytics/StreakHeatmapChart').then((m) => ({
      default: m.StreakHeatmapChart,
    })),
  { loading: ChartFallback }
);

const QuizScoreChart = dynamic(
  () =>
    import('@/components/analytics/QuizScoreChart').then((m) => ({
      default: m.QuizScoreChart,
    })),
  { loading: ChartFallback }
);

interface LearningAnalyticsSectionProps {
  analytics: LearningAnalytics;
  isDarkMode: boolean;
}

/** Charts section of the student dashboard. Receives ready-to-render series. */
export function LearningAnalyticsSection({ analytics, isDarkMode }: LearningAnalyticsSectionProps) {
  const { progressOverTime, streak, quizScores, isLoading } = analytics;

  return (
    <section aria-label="Learning analytics">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Learning Analytics
      </h2>
      <div className="space-y-6">
        <ProgressOverTimeChart
          data={progressOverTime}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          title="Learning Progress Over Time (30 days)"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StreakHeatmapChart
            data={streak}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
            title="Learning Streak Heatmap (12 weeks)"
          />
          <QuizScoreChart
            data={quizScores}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
            title="Quiz Performance"
          />
        </div>
      </div>
    </section>
  );
}
