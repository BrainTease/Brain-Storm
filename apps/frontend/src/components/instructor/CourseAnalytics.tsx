'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface CourseAnalytics {
  id: string;
  title: string;
  enrollments: number;
  completionRate: number;
  rating: number;
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ))}
    </div>
  );
}

const MOCK: CourseAnalytics[] = [
  { id: '1', title: 'Intro to Stellar', enrollments: 80, completionRate: 72, rating: 4.8 },
  { id: '2', title: 'Soroban Smart Contracts', enrollments: 42, completionRate: 55, rating: 4.5 },
  { id: '3', title: 'DeFi on Stellar', enrollments: 20, completionRate: 40, rating: 4.2 },
];

export function CourseAnalytics() {
  const [courses, setCourses] = useState<CourseAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/instructor/courses/analytics')
      .then((r) => setCourses(r.data ?? []))
      .catch(() => setCourses(MOCK))
      .finally(() => setLoading(false));
  }, []);

  const maxEnrollments = Math.max(...courses.map((c) => c.enrollments), 1);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Course Analytics</h2>
      {loading ? (
        <Skeleton />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                {['Course', 'Enrollments', 'Completion Rate', 'Rating'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{c.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${(c.enrollments / maxEnrollments) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-600 dark:text-gray-300">{c.enrollments}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-green-500"
                          style={{ width: `${c.completionRate}%` }}
                        />
                      </div>
                      <span className="text-gray-600 dark:text-gray-300">{c.completionRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-yellow-500">
                    {'★'.repeat(Math.round(c.rating))} <span className="text-gray-600 dark:text-gray-300">{c.rating}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
