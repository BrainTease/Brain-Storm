'use client';

import { memo } from 'react';

import type { Course } from '@/hooks/useCourseSearch';

import { CompareCheckbox } from './CompareCheckbox';
import { CourseCard } from './CourseCard';

interface CourseGridItemProps {
  course: Course;
  index: number;
  /** Stable while the active index is unchanged (see `useRovingFocus`). */
  getItemProps: (index: number) => {
    ref: (el: HTMLElement | null) => void;
    tabIndex: number;
    onFocus: () => void;
  };
}

/**
 * One grid cell. Memoized so unrelated grid state (loading flags, load-more
 * callbacks, result counts) does not re-render every card (#1287).
 */
export const CourseGridItem = memo(function CourseGridItem({
  course,
  index,
  getItemProps,
}: CourseGridItemProps) {
  return (
    <li>
      <CourseCard
        id={course.id}
        title={course.title}
        description={course.description ?? ''}
        instructor={course.instructor ?? ''}
        rating={course.rating ?? 0}
        reviewCount={course.reviewCount}
        level={course.level}
        durationHours={course.durationHours ?? 0}
        price={course.price}
        imageUrl={course.imageUrl}
        enrollmentCount={course.enrollments}
        category={course.category}
        linkFocusProps={getItemProps(index)}
        compareControl={<CompareCheckbox course={course} />}
      />
    </li>
  );
});
