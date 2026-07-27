'use client';

interface StreakIndicatorProps {
  streak: number;
  longestStreak: number;
}

export function StreakIndicator({ streak, longestStreak }: StreakIndicatorProps) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <span
          className="text-2xl motion-reduce:animate-none animate-[pulse_2s_ease-in-out_infinite]"
          aria-hidden="true"
        >
          🔥
        </span>
        <div>
          <p className="text-2xl font-bold leading-none">{streak}</p>
          <p className="text-xs text-gray-500">day streak</p>
        </div>
      </div>
      <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
      <div>
        <p className="text-lg font-semibold leading-none">{longestStreak}</p>
        <p className="text-xs text-gray-500">best streak</p>
      </div>
    </div>
  );
}
