import { CourseCardPrice } from './CourseCardPrice';

export interface CourseCardActionsProps {
  durationHours: number;
  enrollmentCount?: number;
  price?: number;
}

export function CourseCardActions({
  durationHours,
  enrollmentCount,
  price,
}: CourseCardActionsProps) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 mt-auto">
      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span aria-label={`Duration: ${durationHours} hours`}>⏱ {durationHours}h</span>
        {enrollmentCount !== undefined && (
          <span aria-label={`${enrollmentCount} students enrolled`}>
            👥 {enrollmentCount.toLocaleString()}
          </span>
        )}
      </div>
      <CourseCardPrice price={price} />
    </div>
  );
}
