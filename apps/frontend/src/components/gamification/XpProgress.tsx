'use client';

interface XpProgressProps {
  xp: number;
  level: number;
  xpForNextLevel: number;
}

export function XpProgress({ xp, level, xpForNextLevel }: XpProgressProps) {
  const pct = xpForNextLevel > 0 ? Math.min(100, Math.round((xp / xpForNextLevel) * 100)) : 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold">
            {level}
          </span>
          <div>
            <p className="text-sm font-semibold leading-none">Level {level}</p>
            <p className="text-xs text-gray-500">
              {xp.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
            </p>
          </div>
        </div>
        <p className="text-sm font-medium text-blue-600">{pct}%</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Level ${level} progress: ${pct}%`}
        className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
