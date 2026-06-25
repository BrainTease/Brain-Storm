import { CourseDetailSkeleton, VideoPlayerSkeleton } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for course detail and player page
 * Displays while course data, lessons, and player are being loaded
 */
export default function CourseDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <VideoPlayerSkeleton />
      <hr className="my-8 border-gray-200 dark:border-gray-700" />
      <CourseDetailSkeleton />
    </div>
  );
}
