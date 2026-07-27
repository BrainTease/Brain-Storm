'use client';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

interface BadgeGridProps {
  badges: Badge[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        No badges yet — keep learning to earn your first one!
      </p>
    );
  }

  return (
    <ul
      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4"
      role="list"
      aria-label="Badges"
    >
      {badges.map((badge) => {
        const unlocked = badge.unlockedAt !== null;
        return (
          <li key={badge.id} title={badge.description}>
            <div
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                unlocked
                  ? 'cursor-default'
                  : 'opacity-40 grayscale cursor-not-allowed'
              }`}
            >
              <span
                className={`text-3xl ${
                  unlocked
                    ? 'motion-safe:animate-[pop-in_0.3s_ease-out]'
                    : ''
                }`}
                aria-hidden="true"
              >
                {badge.icon}
              </span>
              <p className="text-xs text-center text-gray-700 dark:text-gray-300 leading-tight line-clamp-2">
                {badge.name}
              </p>
              {unlocked && badge.unlockedAt && (
                <time
                  dateTime={badge.unlockedAt}
                  className="text-[10px] text-gray-400"
                >
                  {new Date(badge.unlockedAt).toLocaleDateString()}
                </time>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
