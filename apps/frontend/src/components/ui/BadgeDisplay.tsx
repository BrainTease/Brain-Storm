/**
 * Shared badge display component library.
 * A single configurable `BadgeDisplay` covers every badge-rendering context
 * (profile achievements, leaderboard rows, gamification grids, award counters,
 * status pills) via its `variant` prop, instead of near-duplicate components
 * per screen.
 */

import React from 'react';
import { Badge } from './Badge';

export type BadgeTone = 'default' | 'success' | 'warning' | 'error';

/** Badge interface for consistency across the application */
export interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon?: string;
  variant?: BadgeTone;
  badge?: boolean;
  unlockedAt?: string | null;
}

interface GridVariantProps {
  variant: 'grid';
  badges: BadgeItem[];
  onSelect?: (badge: BadgeItem) => void;
  emptyMessage?: string;
  className?: string;
  columns?: 3 | 4 | 5 | 6;
}

interface InlineVariantProps {
  variant: 'inline';
  items: string[];
  tone?: BadgeTone;
  className?: string;
}

interface CounterVariantProps {
  variant: 'counter';
  count: number;
  label?: string;
  tone?: BadgeTone;
  max?: number;
  className?: string;
}

interface StatusVariantProps {
  variant: 'status';
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'error';
  label?: string;
  className?: string;
}

interface GroupVariantProps {
  variant: 'group';
  label: string;
  items: string[];
  tone?: BadgeTone;
  className?: string;
}

interface PillVariantProps {
  variant: 'pill';
  badges: BadgeItem[];
  className?: string;
}

export type BadgeDisplayProps =
  | GridVariantProps
  | InlineVariantProps
  | CounterVariantProps
  | StatusVariantProps
  | GroupVariantProps
  | PillVariantProps;

const COLUMN_CLASSES = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
} as const;

const STATUS_TONES: Record<StatusVariantProps['status'], BadgeTone> = {
  active: 'success',
  inactive: 'default',
  pending: 'warning',
  completed: 'success',
  error: 'error',
};

const STATUS_LABELS: Record<StatusVariantProps['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  completed: 'Completed',
  error: 'Error',
};

/**
 * Badge Display — renders badges in one of five contexts, selected via `variant`:
 * - `grid`: a grid of badges with optional unlock states (gamification dashboards)
 * - `inline`: a horizontal list of plain badges (leaderboard rows, tag lists)
 * - `counter`: a single badge with a count/number
 * - `status`: a badge reflecting an entity's status
 * - `group`: a labelled inline list
 * - `pill`: earned-achievement pills with icon, name, and unlock date
 */
export const BadgeDisplay: React.FC<BadgeDisplayProps> = (props) => {
  switch (props.variant) {
    case 'grid':
      return <GridBadges {...props} />;
    case 'inline':
      return <InlineBadges {...props} />;
    case 'counter':
      return <CounterBadge {...props} />;
    case 'status':
      return <StatusBadgePill {...props} />;
    case 'group':
      return <GroupBadges {...props} />;
    case 'pill':
      return <PillBadges {...props} />;
  }
};

function GridBadges({
  badges,
  onSelect,
  emptyMessage = 'No badges yet',
  className = '',
  columns = 6,
}: GridVariantProps) {
  if (badges.length === 0) {
    return <p className={`text-sm text-gray-500 py-4 text-center ${className}`}>{emptyMessage}</p>;
  }

  return (
    <ul
      className={`grid ${COLUMN_CLASSES[columns]} sm:grid-cols-4 md:${COLUMN_CLASSES[columns]} gap-4 ${className}`}
      role="list"
      aria-label="Badges"
    >
      {badges.map((badge) => {
        const unlocked = badge.unlockedAt !== null && badge.unlockedAt !== undefined;
        return (
          <li
            key={badge.id}
            title={badge.description}
            onClick={() => onSelect?.(badge)}
            className={onSelect ? 'cursor-pointer' : ''}
          >
            <div
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                unlocked ? 'cursor-default' : 'opacity-40 grayscale cursor-not-allowed'
              }`}
            >
              {badge.icon ? (
                <span
                  className={`text-3xl ${
                    unlocked ? 'motion-safe:animate-[pop-in_0.3s_ease-out]' : ''
                  }`}
                  aria-hidden="true"
                >
                  {badge.icon}
                </span>
              ) : (
                <Badge variant={badge.variant || 'default'}>{badge.name}</Badge>
              )}
              <p className="text-xs text-center text-gray-700 dark:text-gray-300 leading-tight line-clamp-2">
                {badge.name}
              </p>
              {unlocked && badge.unlockedAt && (
                <time dateTime={badge.unlockedAt} className="text-[10px] text-gray-400">
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

function InlineBadges({ items, tone = 'default', className = '' }: InlineVariantProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="list" aria-label="Items">
      {items.map((item, idx) => (
        <Badge key={idx} variant={tone}>
          {item}
        </Badge>
      ))}
    </div>
  );
}

function CounterBadge({ count, label, tone = 'default', max, className = '' }: CounterVariantProps) {
  return (
    <Badge variant={tone} className={className}>
      <span className="font-bold">{max && count > max ? `${max}+` : count}</span>
      {label && <span className="ml-1">{label}</span>}
    </Badge>
  );
}

function StatusBadgePill({ status, label, className = '' }: StatusVariantProps) {
  return (
    <Badge variant={STATUS_TONES[status]} className={className}>
      {label || STATUS_LABELS[status]}
    </Badge>
  );
}

function GroupBadges({ label, items, tone = 'default', className = '' }: GroupVariantProps) {
  return (
    <div className={className}>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</p>
      <InlineBadges variant="inline" items={items} tone={tone} />
    </div>
  );
}

function PillBadges({ badges, className = '' }: PillVariantProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {badges.map((badge) => (
        <div
          key={badge.id}
          title={badge.description}
          className="flex items-center gap-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 px-3 py-1"
        >
          {badge.icon && <span aria-hidden="true">{badge.icon}</span>}
          <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
            {badge.name}
          </span>
          {badge.unlockedAt && (
            <Badge variant="warning" className="text-xs py-0 px-1.5">
              {new Date(badge.unlockedAt).toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
              })}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
