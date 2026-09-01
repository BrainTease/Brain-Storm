/**
 * SkeletonBlock — dashboard loading placeholder.
 *
 * Previously a standalone implementation; now a thin wrapper over the
 * canonical `Skeleton` primitive from `@/components/ui/Skeleton` to avoid
 * duplicate skeleton markup (issue #972).
 *
 * The public API is intentionally kept identical so existing imports continue
 * to work without changes.
 */

import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Grey pulsing placeholder used by dashboard loading states.
 *
 * Pass Tailwind sizing classes via `className` (e.g. `"h-6 w-full"`).
 * Internally delegates to the shared `Skeleton` primitive.
 */
export function SkeletonBlock({ className = 'h-6 w-full' }: { className?: string }) {
  return <Skeleton className={className} animation="pulse" />;
}
