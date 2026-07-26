import type { ReactNode } from 'react';
import { CourseCardHeader } from './CourseCardHeader';
import { CourseCardImage } from './CourseCardImage';
import { CourseCardActions } from './CourseCardActions';

export { CourseCardHeader } from './CourseCardHeader';
export { CourseCardImage } from './CourseCardImage';
export { CourseCardPrice } from './CourseCardPrice';
export { CourseCardActions } from './CourseCardActions';

export interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  instructor: string;
  rating: number;
  reviewCount?: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  durationHours: number;
  price?: number;
  imageUrl?: string;
  enrollmentCount?: number;
  category?: string;
  /** Optional control rendered in the card footer, e.g. a compare toggle. */
  compareControl?: ReactNode;
  /**
   * Wiring supplied by a roving-focus container (see `useRovingFocus`). Applied
   * to the course title link so arrow keys can move between cards while only
   * the active card stays in the tab sequence.
   */
  linkFocusProps?: {
    ref?: (el: HTMLAnchorElement | null) => void;
    tabIndex?: number;
    onFocus?: () => void;
  };
}

export const CourseCard = memo(function CourseCard({
  id,
  title,
  description,
  instructor,
  rating,
  reviewCount,
  level,
  durationHours,
  price,
  imageUrl,
  enrollmentCount,
  category,
  compareControl,
  linkFocusProps,
}: CourseCardProps) {
  return (
    <article
      className="group h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-blue-500"
      aria-label={`Course: ${title}`}
    >
      <CourseCardImage title={title} imageUrl={imageUrl} category={category} />

      <div className="flex flex-col flex-1 p-4 gap-2">
        <CourseCardHeader
          id={id}
          title={title}
          description={description}
          instructor={instructor}
          rating={rating}
          reviewCount={reviewCount}
          level={level}
          linkFocusProps={linkFocusProps}
        />
        <CourseCardActions
          durationHours={durationHours}
          enrollmentCount={enrollmentCount}
          price={price}
        />

        {compareControl && <div className="pt-2">{compareControl}</div>}
      </div>
    </article>
  );
});
