'use client';

import { useGamification } from '@/hooks/useGamification';
import { ReputationScoreWidget } from './ReputationScoreWidget';
import { BadgeGrid } from './BadgeGrid';

interface GamificationDashboardProps {
  userId: string;
}

export function GamificationDashboard({ userId }: GamificationDashboardProps) {
  const { data, isLoading, error, refresh } = useGamification(userId);

  if (isLoading) {
    return (
      <div
        className="space-y-6 animate-pulse"
        aria-busy="true"
        aria-label="Loading gamification data"
      >
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-red-600">{error}</p>
        <button className="text-sm text-blue-600 underline" onClick={refresh}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <ReputationScoreWidget
        level={data.level}
        xp={data.xp}
        xpForNextLevel={data.xpForNextLevel}
        streak={data.streak}
        longestStreak={data.longestStreak}
      />

      <section aria-label="Badges">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Badges</h3>
        <BadgeGrid badges={data.badges} />
      </section>
    </div>
  );
}
