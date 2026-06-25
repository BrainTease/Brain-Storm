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
  language: string;
  price: string;
  sort: SortOption;
  onFilterChange: (key: 'level' | 'category' | 'duration' | 'language' | 'price' | 'sort', value: string) => void;
  onClearAll: () => void;
}

export function FacetedSearch({
  query,
  onQueryChange,
  level,
  category,
  duration,
  language,
  price,
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
        language={language}
        price={price}
        sort={sort}
        onFilterChange={onFilterChange}
      />
      <ActiveFilters
        level={level}
        category={category}
        duration={duration}
        language={language}
        price={price}
        sort={sort}
        onRemove={(key) => onFilterChange(key, key === 'sort' ? 'newest' : '')}
        onClearAll={onClearAll}
      />
    </div>
  );
}
