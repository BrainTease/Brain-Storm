import Link from 'next/link';

export interface CourseCardHeaderProps {
  id: string;
  title: string;
  description: string;
  instructor: string;
  rating: number;
  reviewCount?: number;
  level: 'beginner' | 'intermediate' | 'advanced';
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

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function StarRating({ rating }: { rating: number }) {
  return (
    // role="img" makes the label authoritative: assistive tech reads the
    // rating instead of announcing five unlabelled decorative stars.
    <span className="flex items-center gap-0.5" role="img" aria-label={`Rating: ${rating} out of 5`}>
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

export function CourseCardHeader({
  id,
  title,
  description,
  instructor,
  rating,
  reviewCount,
  level,
  linkFocusProps,
}: CourseCardHeaderProps) {
  const titleId = `course-title-${id}`;

  return (
    <>
      {/* Level badge */}
      <span
        className={`self-start text-xs font-semibold px-2 py-0.5 rounded capitalize ${LEVEL_COLORS[level] ?? LEVEL_COLORS.beginner}`}
      >
        <span className="sr-only">Level: </span>
        {level}
      </span>

      {/* Title */}
      <h3
        id={titleId}
        className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug line-clamp-2"
      >
        <Link
          href={`/courses/${id}`}
          className="rounded hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          {...linkFocusProps}
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300" aria-hidden="true">
          {rating.toFixed(1)}
        </span>
        {reviewCount !== undefined && (
          <span className="text-xs text-gray-400">
            <span className="sr-only">Based on {reviewCount.toLocaleString()} reviews</span>
            <span aria-hidden="true">({reviewCount.toLocaleString()})</span>
          </span>
        )}
      </div>
    </>
  );
}
