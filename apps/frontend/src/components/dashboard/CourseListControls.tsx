'use client';

import { SegmentedControl, SelectInput } from '@/components/ui/form';
import type { CourseFilterKey, CourseSortKey } from '@/lib/dashboard';

const FILTER_OPTIONS: { value: CourseFilterKey; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const SORT_OPTIONS = [
  { value: 'progress', label: 'Sort: Progress' },
  { value: 'title', label: 'Sort: Title' },
];

interface CourseListControlsProps {
  filter: CourseFilterKey;
  sort: CourseSortKey;
  onFilterChange: (filter: CourseFilterKey) => void;
  onSortChange: (sort: CourseSortKey) => void;
}

/** Filter and sort controls for the enrolled-course list. Purely presentational. */
export function CourseListControls({
  filter,
  sort,
  onFilterChange,
  onSortChange,
}: CourseListControlsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <SegmentedControl
        ariaLabel="Filter courses"
        options={FILTER_OPTIONS}
        value={filter}
        onChange={onFilterChange}
      />
      <SelectInput
        id="dashboard-course-sort"
        aria-label="Sort courses"
        options={SORT_OPTIONS}
        value={sort}
        onChange={(e) => onSortChange(e.target.value as CourseSortKey)}
        size="sm"
        fullWidth={false}
      />
    </div>
  );
}
