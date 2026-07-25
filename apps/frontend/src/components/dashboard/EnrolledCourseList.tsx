import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { isCourseComplete, type EnrolledCourse } from '@/lib/dashboard';
import { SkeletonBlock } from './SkeletonBlock';

interface EnrolledCourseListProps {
  courses: EnrolledCourse[];
  isLoading?: boolean;
}

/** One row of the enrolled-course list. */
function EnrolledCourseRow({ course }: { course: EnrolledCourse }) {
  const complete = isCourseComplete(course.progressPct);

  return (
    <li className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Link
            href={`/courses/${course.courseId}`}
            className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate"
          >
            {course.title}
          </Link>
          {course.level && <Badge className="capitalize text-xs shrink-0">{course.level}</Badge>}
        </div>
        <ProgressBar value={course.progressPct} label={`${course.progressPct}% complete`} />
      </div>
      {complete && (
        <span className="text-2xl shrink-0" aria-label="Completed" title="Completed">
          🏆
        </span>
      )}
    </li>
  );
}

/** Enrolled courses as linked rows with a progress bar and completion marker. */
export function EnrolledCourseList({ courses, isLoading = false }: EnrolledCourseListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
        <p>No courses found.</p>
        <Link
          href="/courses"
          className="mt-2 inline-block text-blue-600 hover:underline text-sm"
        >
          Browse courses →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {courses.map((course) => (
        <EnrolledCourseRow key={course.id} course={course} />
      ))}
    </ul>
  );
}
