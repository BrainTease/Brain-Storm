import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

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

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export function CourseCard({
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
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${title} course thumbnail`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        )}
        {category && (
          <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded">
            {category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Level badge */}
        <span
          className={`self-start text-xs font-semibold px-2 py-0.5 rounded capitalize ${LEVEL_COLORS[level] ?? LEVEL_COLORS.beginner}`}
        >
          {level}
        </span>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug line-clamp-2">
          <Link
            href={`/courses/${id}`}
            className="hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:underline"
          >
            {title}
          </Link>
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
          {description}
        </p>

        {/* Instructor */}
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <span className="sr-only">Instructor: </span>
          {instructor}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <StarRating rating={rating} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {rating.toFixed(1)}
          </span>
          {reviewCount !== undefined && (
            <span className="text-xs text-gray-400">({reviewCount.toLocaleString()})</span>
          )}
        </div>

        {/* Footer: duration, enrollments, price */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 mt-auto">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span aria-label={`Duration: ${durationHours} hours`}>⏱ {durationHours}h</span>
            {enrollmentCount !== undefined && (
              <span aria-label={`${enrollmentCount} students enrolled`}>
                👥 {enrollmentCount.toLocaleString()}
              </span>
            )}
          </div>
          <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">
            {price === 0 || price === undefined ? 'Free' : `$${price.toFixed(2)}`}
          </span>
        </div>
      </div>
    </article>
  );
}
