'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
}

interface LearningStatsData {
  coursesEnrolled: number;
  coursesCompleted: number;
  certificatesEarned: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  hoursLearned: number;
  achievements: Achievement[];
}

interface Props {
  userId: string;
}

export default function LearningStats({ userId }: Props) {
  const [stats, setStats] = useState<LearningStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<LearningStatsData>(`/users/${userId}/learning-stats`)
      .then((r) => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <section
      aria-labelledby="stats-heading"
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-5 bg-white dark:bg-gray-900"
    >
      <h2 id="stats-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
        Learning Statistics
      </h2>

      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" label="Loading stats…" />
        </div>
      ) : !stats ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Statistics unavailable. Start a course to see your progress!
        </p>
      ) : (
        <>
          {/* Key metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Enrolled',     value: stats.coursesEnrolled,   emoji: '📚' },
              { label: 'Completed',    value: stats.coursesCompleted,  emoji: '🎓' },
              { label: 'Certificates', value: stats.certificatesEarned, emoji: '📜' },
              { label: 'Points',       value: stats.totalPoints,        emoji: '⭐' },
            ].map(({ label, value, emoji }) => (
              <div
                key={label}
                className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-center"
              >
                <p className="text-xl" aria-hidden="true">{emoji}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Streak */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              🔥 Current streak: <span className="font-semibold">{stats.currentStreak} day{stats.currentStreak !== 1 ? 's' : ''}</span>
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              Best: {stats.longestStreak} day{stats.longestStreak !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Completion rate */}
          {stats.coursesEnrolled > 0 && (
            <ProgressBar
              value={Math.round((stats.coursesCompleted / stats.coursesEnrolled) * 100)}
              label="Course completion rate"
            />
          )}

          {/* Hours learned */}
          <p className="text-sm text-gray-600 dark:text-gray-300">
            ⏱️ Total time learning:{' '}
            <span className="font-medium">{stats.hoursLearned} hour{stats.hoursLearned !== 1 ? 's' : ''}</span>
          </p>

          {/* Achievements */}
          {stats.achievements.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                🏆 Achievements
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.achievements.map((a) => (
                  <div
                    key={a.id}
                    title={`${a.description} — earned ${new Date(a.earnedAt).toLocaleDateString()}`}
                    className="flex items-center gap-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 px-3 py-1"
                  >
                    <span aria-hidden="true">{a.icon}</span>
                    <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                      {a.title}
                    </span>
                    <Badge variant="warning" className="text-xs py-0 px-1.5">
                      {new Date(a.earnedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
