import { CircularProgress } from '@/components/ui/CircularProgress';
import { isCourseComplete, type EnrolledCourse } from '@/lib/dashboard';
import { SkeletonBlock } from './SkeletonBlock';

interface CourseProgressListProps {
  courses: EnrolledCourse[];
  isLoading?: boolean;
}

function CourseProgressCard({ course }: { course: EnrolledCourse }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-center gap-4">
      <CircularProgress value={course.progressPct} size={72} strokeWidth={7} />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{course.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {isCourseComplete(course.progressPct)
            ? '🏆 Completed'
            : `${course.progressPct}% complete`}
        </p>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${course.progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Enrolled courses rendered with a circular progress dial — the overview
 * dashboard's variant of {@link EnrolledCourseList}.
 */
export function CourseProgressList({ courses, isLoading = false }: CourseProgressListProps) {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBlock className="h-5 w-2/5" />
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </>
    );
  }

  if (courses.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400">You have not enrolled in any courses yet.</p>
    );
  }

  return (
    <>
      {courses.map((course) => (
        <CourseProgressCard key={course.id} course={course} />
      ))}
    </>
  );
}
