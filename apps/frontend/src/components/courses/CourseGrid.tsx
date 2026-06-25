import { useEffect, useRef } from 'react';
import { Course } from '@/hooks/useCourseSearch';
import { CourseCard } from './CourseCard';

function CompareCheckbox({ course }: { course: Course }) {
  const { isSelected, toggle, isFull } = useCompareStore();
  const selected = isSelected(course.id);
  const full = isFull();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

interface CourseGridProps {
  courses: Course[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  error?: Error | null;
}

export function CourseGrid({ courses, total, isLoading, isLoadingMore, hasMore, onLoadMore, error }: CourseGridProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!observerRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/20"
        role="alert"
      >
        Error: {error.message}
      </div>
    );
  }

  return (
    <>
      {!isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
          {total > 0 ? `${total} course${total !== 1 ? 's' : ''} found` : 'No courses match those filters.'}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Courses list">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)
          : courses.length === 0
          ? null
          : courses.map((course, index) => (
              <div
                key={course.id}
                ref={index === courses.length - 1 ? observerRef : null}
                role="listitem"
              >
                <CourseCard
                  id={course.id}
                  title={course.title}
                  description={course.description ?? ''}
                  instructor={course.instructor ?? ''}
                  rating={course.rating ?? 0}
                  reviewCount={course.reviewCount}
                  level={course.level}
                  durationHours={course.durationHours ?? 0}
                  price={course.price}
                  imageUrl={course.imageUrl}
                  enrollmentCount={course.enrollments}
                  category={course.category}
                />
              </div>
            ))}
      </div>

      {isLoadingMore && (
        <div className="flex justify-center py-8" aria-live="polite">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Loading more courses...
          </div>
        </div>
      )}

      {!isLoading && !hasMore && courses.length > 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">You&apos;ve reached the end of the list.</div>
      )}
    </>
  );
}
