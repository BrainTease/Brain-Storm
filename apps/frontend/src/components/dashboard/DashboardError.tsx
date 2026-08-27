/** Inline banner for a dashboard-wide load failure. Renders nothing when there is no error. */
export function DashboardError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/20"
    >
      {message}
    </div>
  );
}
