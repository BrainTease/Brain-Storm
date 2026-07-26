import { memo } from 'react';
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
}: CourseCardProps) {
  return (
    <article
      className="group flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-blue-500"
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
        />
        <CourseCardActions
          durationHours={durationHours}
          enrollmentCount={enrollmentCount}
          price={price}
        />
      </div>
    </article>
  );
});
