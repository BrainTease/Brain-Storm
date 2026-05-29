'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import { useDebounce } from './useDebounce';

export type SortOption = 'newest' | 'popular' | 'rating';

export interface Course {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  durationHours?: number;
  price?: number;
  rating?: number;
  enrollments?: number;
  description?: string;
}

export interface CoursesResponse {
  data: Course[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchFilters {
  query: string;
  level: string;
  category: string;
  duration: string;
  sort: SortOption;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch courses');
    return res.json();
  });

export function useCourseSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get('search') ?? '');
  const [level, setLevel] = useState(() => searchParams.get('level') ?? '');
  const [category, setCategory] = useState(() => searchParams.get('category') ?? '');
  const [duration, setDuration] = useState(() => searchParams.get('duration') ?? '');
  const [sort, setSort] = useState<SortOption>(() => (searchParams.get('sort') as SortOption) ?? 'newest');

  const debouncedQuery = useDebounce(query);

  const pushUrl = useCallback(
    (overrides: Partial<SearchFilters> = {}) => {
      const p = new URLSearchParams();
      const q = overrides.query ?? debouncedQuery;
      const l = overrides.level ?? level;
      const c = overrides.category ?? category;
      const d = overrides.duration ?? duration;
      const s = overrides.sort ?? sort;
      if (q.trim()) p.set('search', q.trim());
      if (l) p.set('level', l);
      if (c) p.set('category', c);
      if (d) p.set('duration', d);
      if (s !== 'newest') p.set('sort', s);
      router.push(`/courses?${p.toString()}`, { scroll: false });
    },
    [debouncedQuery, level, category, duration, sort, router]
  );

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    pushUrl({ query: debouncedQuery });
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterKey = `${debouncedQuery}-${level}-${category}-${duration}-${sort}`;

  const getKey = (pageIndex: number, previousPageData: CoursesResponse | null) => {
    if (previousPageData && previousPageData.data.length === 0) return null;
    const p = new URLSearchParams();
    if (debouncedQuery.trim()) p.set('search', debouncedQuery.trim());
    if (level) p.set('level', level);
    if (category) p.set('category', category);
    if (duration) {
      const [min, max] = duration.split('-');
      p.set('durationMin', min);
      p.set('durationMax', max);
    }
    p.set('sort', sort);
    p.set('page', String(pageIndex + 1));
    p.set('limit', '9');
    return `/courses?${p.toString()}`;
  };

  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite<CoursesResponse>(
    getKey,
    fetcher,
    { revalidateOnFocus: false, revalidateFirstPage: false }
  );

  useEffect(() => {
    setSize(1);
  }, [filterKey, setSize]);

  const courses = data ? data.flatMap((page) => page.data) : [];
  const isLoadingMore = isValidating && size > 1;
  const hasMore = data && data[data.length - 1]?.data.length === 9;

  const applyFilter = useCallback(
    (key: keyof SearchFilters, value: string) => {
      const updates: Partial<SearchFilters> = { [key]: value };
      if (key === 'level') setLevel(value);
      if (key === 'category') setCategory(value);
      if (key === 'duration') setDuration(value);
      if (key === 'sort') setSort(value as SortOption);
      pushUrl(updates);
    },
    [pushUrl]
  );

  const clearAll = useCallback(() => {
    setLevel('');
    setCategory('');
    setDuration('');
    setSort('newest');
    router.push('/courses', { scroll: false });
  }, [router]);

  return {
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
    loadMore: () => setSize(size + 1),
    filters: { query, level, category, duration, sort },
  };
}
