'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useBookmarksStore } from '@/store/bookmarks.store';
import { CompareBar } from '@/components/courses/CompareBar';
import { FacetedSearch } from '@/components/courses/FacetedSearch';
import { CourseGrid } from '@/components/courses/CourseGrid';
import { useCourseSearch } from '@/hooks/useCourseSearch';
import { useSearchAnalytics } from '@/hooks/useSearchAnalytics';

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors z-50"
      aria-label="Back to top"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
}

export default function CoursesPage() {
  const { fetchBookmarks } = useBookmarksStore();
  const {
    query,
    setQuery,
    level,
    category,
    duration,
    sort,
    applyFilter,
    clearAll,
    courses,
    error,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    filters,
  } = useCourseSearch();

  useSearchAnalytics(query, filters, courses.length);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Scroll position preservation
  useEffect(() => {
    const scrollPos = sessionStorage.getItem('courses-scroll-pos');
    if (scrollPos) {
      window.scrollTo(0, parseInt(scrollPos, 10));
      sessionStorage.removeItem('courses-scroll-pos');
    }

    const handleBeforeUnload = () => {
      sessionStorage.setItem('courses-scroll-pos', window.pageYOffset.toString());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <ProtectedRoute>
      <main className="max-w-5xl mx-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Courses</h1>

        <FacetedSearch
          query={query}
          onQueryChange={setQuery}
          level={level}
          category={category}
          duration={duration}
          sort={sort}
          onFilterChange={applyFilter}
          onClearAll={clearAll}
        />

        <CourseGrid
          courses={courses}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          error={error}
        />
      </main>
      <CompareBar />
      <BackToTopButton />
    </ProtectedRoute>
  );
}
