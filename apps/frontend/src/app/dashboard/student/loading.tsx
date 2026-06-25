import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for student dashboard page
 * Displays while student analytics and progress data is being fetched
 */
export default function StudentDashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton height={32} width="40%" />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-xl p-4 space-y-2">
            <Skeleton height={16} width="60%" />
            <Skeleton height={24} width="50%" />
          </div>
        ))}
      </div>

      {/* Analytics charts */}
      <div className="space-y-6">
        <Skeleton height={24} width="30%" />
        <Skeleton height={300} className="w-full rounded-lg" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton height={300} className="w-full rounded-lg" />
          <Skeleton height={300} className="w-full rounded-lg" />
        </div>
      </div>

      {/* Courses section */}
      <div className="space-y-4">
        <Skeleton height={24} width="30%" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-xl p-4 flex gap-4">
            <Skeleton height={60} width={60} variant="rectangular" />
            <div className="flex-1 space-y-2">
              <Skeleton height={20} width="50%" />
              <Skeleton height={8} className="w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
