/**
 * Shared badge display component library
 * Provides reusable badge components and utilities
 */

import React from 'react';
import { Badge } from './Badge';

/**
 * Badge interface for consistency across the application
 */
export interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  badge?: boolean;
  unlockedAt?: string | null;
}

interface BadgeDisplayProps {
  badges: BadgeItem[];
  onSelect?: (badge: BadgeItem) => void;
  emptyMessage?: string;
  className?: string;
  columns?: 3 | 4 | 5 | 6;
}

/**
 * Badge Display Grid Component
 * Shows a grid of badges with optional unlock states
 */
export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badges,
  onSelect,
  emptyMessage = 'No badges yet',
  className = '',
  columns = 6,
}) => {
  if (badges.length === 0) {
    return (
      <p className={`text-sm text-gray-500 py-4 text-center ${className}`}>
        {emptyMessage}
      </p>
    );
  }

  const columnClasses = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  return (
    <ul
      className={`grid ${columnClasses[columns]} sm:grid-cols-4 md:${columnClasses[columns]} gap-4 ${className}`}
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
};

/**
 * Inline Badge List Component
 * Shows badges in a horizontal list
 */
export const InlineBadgeList: React.FC<{
  items: string[];
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}> = ({ items, variant = 'default', className = '' }) => (
  <div className={`flex flex-wrap gap-2 ${className}`} role="list" aria-label="Items">
    {items.map((item, idx) => (
      <Badge key={idx} variant={variant}>
        {item}
      </Badge>
    ))}
  </div>
);

/**
 * Badge Counter Component
 * Shows a badge with a count/number
 */
export const BadgeCounter: React.FC<{
  count: number;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  max?: number;
  className?: string;
}> = ({ count, label, variant = 'default', max, className = '' }) => (
  <Badge variant={variant} className={className}>
    <span className="font-bold">{max && count > max ? `${max}+` : count}</span>
    {label && <span className="ml-1">{label}</span>}
  </Badge>
);

/**
 * Status Badge Component
 * Shows status with appropriate styling
 */
export const StatusBadge: React.FC<{
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'error';
  label?: string;
  className?: string;
}> = ({ status, label, className = '' }) => {
  const statusVariants = {
    active: 'success',
    inactive: 'default',
    pending: 'warning',
    completed: 'success',
    error: 'error',
  } as const;

  const defaultLabels = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    completed: 'Completed',
    error: 'Error',
  };

  return (
    <Badge
      variant={statusVariants[status]}
      className={className}
    >
      {label || defaultLabels[status]}
    </Badge>
  );
};

/**
 * Badge Group Component
 * Groups multiple badges with a label
 */
export const BadgeGroup: React.FC<{
  label: string;
  items: string[];
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}> = ({ label, items, variant = 'default', className = '' }) => (
  <div className={className}>
    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
      {label}
    </p>
    <InlineBadgeList items={items} variant={variant} />
  </div>
);
