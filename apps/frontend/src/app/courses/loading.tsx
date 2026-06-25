import { CourseListSkeleton } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for courses page
 * Displays while course data is being fetched
 */
export default function CoursesLoading() {
  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Search and filters skeleton */}
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-2">
          <div className="h-10 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      {/* Course list skeleton */}
      <CourseListSkeleton count={9} />
    </div>
  );
}
