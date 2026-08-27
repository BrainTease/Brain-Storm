'use client';

interface ReputationScoreWidgetProps {
  level: number;
  xp: number;
  xpForNextLevel: number;
  streak: number;
  longestStreak: number;
  className?: string;
  compact?: boolean;
}

export function ReputationScoreWidget({
  level,
  xp,
  xpForNextLevel,
  streak,
  longestStreak,
  className = '',
  compact = false,
}: ReputationScoreWidgetProps) {
  const xpPercentage = (xp / xpForNextLevel) * 100;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-4 ${className}`}>
        <div className="text-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{level}</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">Level</p>
        </div>
        <div className="h-12 w-px bg-gray-200 dark:bg-gray-700" />
        <div className="text-center">
          <span className="text-2xl font-bold text-orange-500">{streak}</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <section aria-label="Level and XP">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Level</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{level}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {xp} / {xpForNextLevel} XP
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${Math.min(xpPercentage, 100)}%` }}
              role="progressbar"
              aria-valuenow={xp}
              aria-valuemin={0}
              aria-valuemax={xpForNextLevel}
            />
          </div>
        </div>
      </section>

      <section aria-label="Streak">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Streak</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Streak</p>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{streak}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">days</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Longest Streak</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {longestStreak}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">days</p>
          </div>
        </div>
      </section>
    </div>
  );
}
