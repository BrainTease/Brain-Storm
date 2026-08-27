'use client';

import { useCompareStore } from '@/store/compare.store';
import type { Course } from '@/hooks/useCourseSearch';

/**
 * Per-card toggle that feeds the comparison tray. Rendered as a real checkbox
 * so it is announced with its state and reachable from the keyboard.
 */
export function CompareCheckbox({ course }: { course: Course }) {
  const { isSelected, toggle, isFull } = useCompareStore();
  const selected = isSelected(course.id);
  const disabled = !selected && isFull();

  return (
    <label
      className={`inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={() =>
          toggle({
            id: course.id,
            title: course.title,
            level: course.level,
            category: course.category,
            durationHours: course.durationHours,
            price: course.price,
            rating: course.rating,
            description: course.description,
            enrollments: course.enrollments,
          })
        }
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
        aria-label={
          disabled ? `Compare ${course.title} — comparison list is full` : `Compare ${course.title}`
        }
      />
      <span aria-hidden="true">Compare</span>
    </label>
  );
}
