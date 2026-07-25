import type { ChangeEvent } from 'react';
import { SortOption } from '@/hooks/useCourseSearch';
import { SelectInput, type SelectOption } from '@/components/ui/form';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const CATEGORIES = ['Blockchain', 'DeFi', 'Smart Contracts', 'Web3', 'Stellar'] as const;
const DURATIONS = [
  { label: '< 2h', value: '0-2' },
  { label: '2–5h', value: '2-5' },
  { label: '5–10h', value: '5-10' },
  { label: '10h+', value: '10-999' },
];
const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'Arabic', value: 'ar' },
];
const PRICE_OPTIONS = [
  { label: 'Free', value: 'free' },
  { label: 'Paid', value: 'paid' },
];
const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Most Popular', value: 'popular' },
  { label: 'Top Rated', value: 'rating' },
];

const LEVEL_OPTIONS: SelectOption[] = LEVELS.map((l) => ({
  value: l,
  label: l.charAt(0).toUpperCase() + l.slice(1),
}));
const CATEGORY_OPTIONS: SelectOption[] = CATEGORIES.map((c) => ({ value: c, label: c }));

type FilterKey = 'level' | 'category' | 'duration' | 'language' | 'price' | 'sort';

interface CourseFiltersProps {
  level: string;
  category: string;
  duration: string;
  language: string;
  price: string;
  sort: SortOption;
  onFilterChange: (key: FilterKey, value: string) => void;
}

export function CourseFilters({
  level,
  category,
  duration,
  language,
  price,
  sort,
  onFilterChange,
}: CourseFiltersProps) {
  /** Every control in this bar is a compact, content-width, visually unlabelled select. */
  function filterProps(key: FilterKey, value: string, ariaLabel: string) {
    return {
      id: `course-filter-${key}`,
      value,
      onChange: (e: ChangeEvent<HTMLSelectElement>) => onFilterChange(key, e.target.value),
      'aria-label': ariaLabel,
      size: 'sm' as const,
      fullWidth: false,
    };
  }

  return (
    <div className="flex flex-wrap gap-3">
      <SelectInput
        {...filterProps('level', level, 'Filter by level')}
        placeholderOption={{ value: '', label: 'All Levels' }}
        options={LEVEL_OPTIONS}
      />
      <SelectInput
        {...filterProps('category', category, 'Filter by category')}
        placeholderOption={{ value: '', label: 'All Categories' }}
        options={CATEGORY_OPTIONS}
      />
      <SelectInput
        {...filterProps('duration', duration, 'Filter by duration')}
        placeholderOption={{ value: '', label: 'Any Duration' }}
        options={DURATIONS}
      />
      <SelectInput
        {...filterProps('language', language, 'Filter by language')}
        placeholderOption={{ value: '', label: 'All Languages' }}
        options={LANGUAGES}
      />
      <SelectInput
        {...filterProps('price', price, 'Filter by price')}
        placeholderOption={{ value: '', label: 'All Prices' }}
        options={PRICE_OPTIONS}
      />
      <SelectInput {...filterProps('sort', sort, 'Sort courses')} options={SORT_OPTIONS} />
    </div>
  );
}

export { DURATIONS, SORT_OPTIONS, LANGUAGES, PRICE_OPTIONS };
