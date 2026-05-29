import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Course } from '@/hooks/useCourseSearch';
import { useBookmarksStore } from '@/store/bookmarks.store';
import { useCompareStore } from '@/store/compare.store';

function SkeletonCard() {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900 animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
    </div>
  );
}

function BookmarkButton({ course }: { course: Course }) {
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarksStore();
  const bookmarked = isBookmarked(course.id);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        bookmarked ? removeBookmark(course.id) : addBookmark(course);
      }}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark course'}
      aria-pressed={bookmarked}
      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      <svg
        className={`w-4 h-4 ${bookmarked ? 'fill-blue-500 text-blue-500' : 'fill-none text-gray-400'}`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  );
}

function CompareCheckbox({ course }: { course: Course }) {
  const { isSelected, toggle, isFull } = useCompareStore();
  const selected = isSelected(course.id);
  const full = isFull();
  return (
    <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={selected}
        disabled={!selected && full}
        onChange={() => toggle(course)}
        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
        aria-label={`Compare ${course.title}`}
      />
      Compare
    </label>
  );
}

interface CourseGridProps {
  courses: Course[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  error?: Error | null;
}

export function CourseGrid({ courses, isLoading, isLoadingMore, hasMore, onLoadMore, error }: CourseGridProps) {
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="grid" aria-label="Courses list">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : courses.length === 0
          ? <p className="col-span-3 text-gray-500 dark:text-gray-400">No courses match those filters.</p>
          : courses.map((course, index) => (
              <div
                key={course.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-900 flex flex-col gap-2"
                ref={index === courses.length - 1 ? observerRef : null}
                role="gridcell"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                    {course.title}
                  </h2>
                  <BookmarkButton course={course} />
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="capitalize">{course.level}</span>
                  {course.category && (
                    <>
                      <span>·</span>
                      <span>{course.category}</span>
                    </>
                  )}
                  {course.durationHours != null && (
                    <>
                      <span>·</span>
                      <span>{course.durationHours}h</span>
                    </>
                  )}
                  {course.rating != null && (
                    <>
                      <span>·</span>
                      <span>★ {course.rating}</span>
                    </>
                  )}
                </div>
                {course.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{course.description}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2">
                  <CompareCheckbox course={course} />
                  {course.price != null && (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {course.price === 0 ? 'Free' : `$${course.price}`}
                    </span>
                  )}
                  <Link
                    href={`/courses/${course.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline ml-auto"
                  >
                    View →
                  </Link>
                </div>
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
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">You've reached the end of the list.</div>
      )}
    </>
  );
}
