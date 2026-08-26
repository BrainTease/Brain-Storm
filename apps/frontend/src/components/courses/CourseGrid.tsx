'use client';

import { useEffect, useRef } from 'react';
import { Course } from '@/hooks/useCourseSearch';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { CourseCard } from './CourseCard';
import { CourseCardSkeleton } from './CourseCardSkeleton';
import { CompareCheckbox } from './CompareCheckbox';
import { Spinner } from '@/components/ui/Spinner';

const SKELETON_COUNT = 6;

interface CourseGridProps {
  courses: Course[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  error?: Error | null;
}

export function CourseGrid({
  courses,
  total,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  error,
}: CourseGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { onKeyDown, getItemProps } = useRovingFocus(courses.length);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
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
      <p className="text-sm text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
        {isLoading
          ? 'Loading courses…'
          : total > 0
            ? `${total} course${total !== 1 ? 's' : ''} found`
            : 'No courses match those filters.'}
      </p>

      <p id="course-grid-help" className="sr-only">
        Use the arrow keys to move between courses, and Home or End to jump to the first or last
        course.
      </p>

      <ul
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 list-none p-0"
        aria-label="Courses"
        aria-describedby="course-grid-help"
        aria-busy={isLoading}
        onKeyDown={onKeyDown}
      >
        {isLoading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <li key={i}>
                <CourseCardSkeleton />
              </li>
            ))
          : courses.map((course, index) => (
              <li key={course.id}>
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
                  linkFocusProps={getItemProps(index)}
                  compareControl={<CompareCheckbox course={course} />}
                />
              </li>
            ))}
      </ul>

      {/* Sentinel drives infinite scroll for pointer users. */}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-px" />}

      {isLoadingMore && (
        <div className="flex justify-center py-8" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Spinner size="sm" label="Loading more courses…" />
            <span aria-hidden="true">Loading more courses...</span>
          </div>
        </div>
      )}

      {/* Keyboard- and screen-reader-accessible counterpart to the sentinel. */}
      {!isLoading && hasMore && !isLoadingMore && (
        <div className="flex justify-center py-8">
          <button
            type="button"
            onClick={onLoadMore}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
          >
            Load more courses
          </button>
        </div>
      )}

      {!isLoading && !hasMore && courses.length > 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          You&apos;ve reached the end of the list.
        </div>
      )}
    </>
  );
}
