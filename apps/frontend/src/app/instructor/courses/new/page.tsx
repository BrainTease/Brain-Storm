'use client';

import dynamic from 'next/dynamic';

const CourseCreationWizard = dynamic(
  () => import('@/components/courses/CourseCreationWizard'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20" aria-live="polite">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading editor...</span>
      </div>
    ),
  }
);

export default function NewCoursePage() {
  return <CourseCreationWizard />;
}
