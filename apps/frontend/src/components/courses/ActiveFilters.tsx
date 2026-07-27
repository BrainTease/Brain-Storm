import { SortOption } from '@/hooks/useCourseSearch';
import { DURATIONS, SORT_OPTIONS, LANGUAGES, PRICE_OPTIONS } from './CourseFilters';

interface ActiveFiltersProps {
  level: string;
  category: string;
  duration: string;
  language: string;
  price: string;
  sort: SortOption;
  onRemove: (key: 'level' | 'category' | 'duration' | 'language' | 'price' | 'sort') => void;
  onClearAll: () => void;
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-3 py-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="rounded hover:text-blue-900 dark:hover:text-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </span>
  );
}

export function ActiveFilters({ level, category, duration, language, price, sort, onRemove, onClearAll }: ActiveFiltersProps) {
  const activeFilters: { label: string; clear: () => void }[] = [
    ...(level ? [{ label: `Level: ${level}`, clear: () => onRemove('level') }] : []),
    ...(category ? [{ label: `Category: ${category}`, clear: () => onRemove('category') }] : []),
    ...(duration
      ? [
          {
            label: `Duration: ${DURATIONS.find((d) => d.value === duration)?.label ?? duration}`,
            clear: () => onRemove('duration'),
          },
        ]
      : []),
    ...(language
      ? [{ label: `Language: ${LANGUAGES.find((l) => l.value === language)?.label ?? language}`, clear: () => onRemove('language') }]
      : []),
    ...(price
      ? [{ label: `Price: ${PRICE_OPTIONS.find((p) => p.value === price)?.label ?? price}`, clear: () => onRemove('price') }]
      : []),
    ...(sort !== 'newest'
      ? [{ label: `Sort: ${SORT_OPTIONS.find((s) => s.value === sort)?.label}`, clear: () => onRemove('sort') }]
      : []),
  ];

  if (activeFilters.length === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-2 items-center"
      role="group"
      aria-label={`Active filters, ${activeFilters.length} applied`}
    >
      {activeFilters.map((f) => (
        <FilterChip key={f.label} label={f.label} onRemove={f.clear} />
      ))}
      <button
        onClick={onClearAll}
        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Clear all filters
      </button>
    </div>
  );
}
