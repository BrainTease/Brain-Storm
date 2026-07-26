/**
 * Grey pulsing placeholder used by the dashboard's loading states.
 *
 * Sizing is passed in as Tailwind classes so a caller can express "title-sized"
 * or "card-sized" without this component knowing about either.
 */
export function SkeletonBlock({ className = 'h-6 w-full' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}
