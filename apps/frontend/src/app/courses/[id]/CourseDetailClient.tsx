'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { ReviewList } from '@/components/reviews/ReviewList';
import { EnrollmentModal } from '@/components/courses/EnrollmentModal';
import { Button } from '@/components/ui/Button';

interface CourseDetailClientProps {
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  level: string;
  durationHours: number;
  price?: number;
}

export function CourseDetailClient({
  courseId,
  courseTitle,
  courseDescription,
  level,
  durationHours,
  price,
}: CourseDetailClientProps) {
  const [tab, setTab] = useState<'overview' | 'reviews'>('overview');
  const [reviewsKey, setReviewsKey] = useState(0);
  const [enrollOpen, setEnrollOpen] = useState(false);

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <Link href="/courses" className="text-blue-600 hover:underline text-sm inline-block">
        ← Back to Courses
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{courseTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
            {level} · {durationHours}h
          </p>
          <p className="text-gray-700 dark:text-gray-300 mt-3 leading-relaxed">{courseDescription}</p>
        </div>
        <Button onClick={() => setEnrollOpen(true)} className="shrink-0">
          Enroll Now
        </Button>
      </div>

      <Link href={`/courses/${courseId}/forum`} className="text-blue-600 hover:underline text-sm inline-block">
        View Discussion Forum →
      </Link>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        {(['overview', 'reviews'] as const).map((t) => (
          <button
            key={t}
            className={`pb-2 px-1 capitalize text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setTab(t)}
            aria-selected={tab === t}
            role="tab"
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">Course content and details would appear here.</p>
          <ReviewForm
            courseId={courseId}
            onSuccess={() => {
              setTab('reviews');
              setReviewsKey((k) => k + 1);
            }}
          />
        </div>
      )}

      {tab === 'reviews' && <ReviewList key={reviewsKey} courseId={courseId} />}

      <EnrollmentModal
        isOpen={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        courseId={courseId}
        courseTitle={courseTitle}
        price={price}
        onSuccess={() => setEnrollOpen(false)}
      />
    </main>
  );
}
