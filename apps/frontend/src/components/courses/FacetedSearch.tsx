'use client';

import { SearchInput } from './SearchInput';
import { CourseFilters } from './CourseFilters';
import { ActiveFilters } from './ActiveFilters';
import { SortOption } from '@/hooks/useCourseSearch';

interface FacetedSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  level: string;
  category: string;
  duration: string;
  sort: SortOption;
  onFilterChange: (key: 'level' | 'category' | 'duration' | 'sort', value: string) => void;
  onClearAll: () => void;
}

export function FacetedSearch({
  query,
  onQueryChange,
  level,
  category,
  duration,
  sort,
  onFilterChange,
  onClearAll,
}: FacetedSearchProps) {
  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={onQueryChange} />
      <CourseFilters
        level={level}
        category={category}
        duration={duration}
        sort={sort}
        onFilterChange={onFilterChange}
      />
      <ActiveFilters
        level={level}
        category={category}
        duration={duration}
        sort={sort}
        onRemove={(key) => onFilterChange(key, key === 'sort' ? 'newest' : '')}
        onClearAll={onClearAll}
      />
    </div>
  );
}
