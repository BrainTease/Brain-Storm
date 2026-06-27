'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface Course {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt?: string;
}

const MOCK: Course[] = [
  { id: '1', title: 'Intro to Stellar', status: 'published', updatedAt: '2026-05-20' },
  { id: '2', title: 'Soroban Smart Contracts', status: 'published', updatedAt: '2026-05-15' },
  { id: '3', title: 'DeFi on Stellar', status: 'draft', updatedAt: '2026-05-10' },
];

const STATUS_STYLES: Record<Course['status'], string> = {
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export function CourseEditor() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/instructor/courses')
      .then((r) => setCourses(r.data ?? []))
      .catch(() => setCourses(MOCK))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My Courses</h2>
        <Link href="/instructor/courses/new">
          <Button className="text-sm py-1.5">+ New Course</Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No courses yet. Create your first course!</p>
      ) : (
        <div className="space-y-2">
          {courses.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.title}</p>
                {c.updatedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Updated {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status]}`}>
                {c.status}
              </span>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/instructor/courses/${c.id}/edit`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit
                </Link>
                <Link
                  href={`/courses/${c.id}`}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
