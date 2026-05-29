import { SortOption } from '@/hooks/useCourseSearch';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const CATEGORIES = ['Blockchain', 'DeFi', 'Smart Contracts', 'Web3', 'Stellar'] as const;
const DURATIONS = [
  { label: '< 2h', value: '0-2' },
  { label: '2–5h', value: '2-5' },
  { label: '5–10h', value: '5-10' },
  { label: '10h+', value: '10-999' },
];
const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Most Popular', value: 'popular' },
  { label: 'Top Rated', value: 'rating' },
];

interface CourseFiltersProps {
  level: string;
  category: string;
  duration: string;
  sort: SortOption;
  onFilterChange: (key: 'level' | 'category' | 'duration' | 'sort', value: string) => void;
}

export function CourseFilters({ level, category, duration, sort, onFilterChange }: CourseFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={level}
        onChange={(e) => onFilterChange('level', e.target.value)}
        className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        aria-label="Filter by level"
      >
        <option value="">All Levels</option>
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </option>
        ))}
      </select>

      <select
        value={category}
        onChange={(e) => onFilterChange('category', e.target.value)}
        className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        aria-label="Filter by category"
      >
        <option value="">All Categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={duration}
        onChange={(e) => onFilterChange('duration', e.target.value)}
        className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        aria-label="Filter by duration"
      >
        <option value="">Any Duration</option>
        {DURATIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      <select
        value={sort}
        onChange={(e) => onFilterChange('sort', e.target.value)}
        className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        aria-label="Sort courses"
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export { DURATIONS, SORT_OPTIONS };
