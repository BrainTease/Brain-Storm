import type { ReactNode } from 'react';

interface DashboardSectionProps {
  title: string;
  /** Accessible name for the section landmark; defaults to `title`. */
  ariaLabel?: string;
  /** Controls placed on the same row as the heading, e.g. filter/sort. */
  actions?: ReactNode;
  /** Heading scale: the overview dashboard uses `lg`, the student dashboard `md`. */
  size?: 'md' | 'lg';
  className?: string;
  children: ReactNode;
}

const HEADING_CLASS = {
  md: 'text-xl font-semibold text-gray-900 dark:text-gray-100',
  lg: 'text-2xl font-semibold text-gray-900 dark:text-gray-100',
} as const;

/** Titled dashboard section with an optional action row beside the heading. */
export function DashboardSection({
  title,
  ariaLabel,
  actions,
  size = 'md',
  className = '',
  children,
}: DashboardSectionProps) {
  return (
    <section aria-label={ariaLabel ?? title}>
      {actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className={HEADING_CLASS[size]}>{title}</h2>
          {actions}
        </div>
      ) : (
        <h2 className={`${HEADING_CLASS[size]} ${size === 'md' ? 'mb-4' : ''}`}>{title}</h2>
      )}
      <div className={className}>{children}</div>
    </section>
  );
}
