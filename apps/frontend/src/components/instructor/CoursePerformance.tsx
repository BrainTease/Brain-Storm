'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface PerformanceData {
  courseId: string;
  courseTitle: string;
  avgScore: number;
  dropOffRate: number;
  avgCompletionDays: number;
  totalReviews: number;
  avgRating: number;
}

const MOCK: PerformanceData[] = [
  { courseId: '1', courseTitle: 'Intro to Stellar', avgScore: 82, dropOffRate: 18, avgCompletionDays: 14, totalReviews: 34, avgRating: 4.8 },
  { courseId: '2', courseTitle: 'Soroban Smart Contracts', avgScore: 74, dropOffRate: 28, avgCompletionDays: 21, totalReviews: 18, avgRating: 4.5 },
  { courseId: '3', courseTitle: 'DeFi on Stellar', avgScore: 68, dropOffRate: 35, avgCompletionDays: 30, totalReviews: 9, avgRating: 4.2 },
];

function MetricBar({ value, max = 100, color = 'bg-blue-500' }: { value: number; max?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-300 w-8">{value}%</span>
    </div>
  );
}

export function CoursePerformance() {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/instructor/courses/performance')
      .then((r) => setData(r.data ?? []))
      .catch(() => setData(MOCK))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Course Performance Metrics</h2>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <tr>
                {['Course', 'Avg Score', 'Drop-off Rate', 'Avg Days to Complete', 'Reviews', 'Rating'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {data.map((d) => (
                <tr key={d.courseId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-[160px] truncate">{d.courseTitle}</td>
                  <td className="px-4 py-3"><MetricBar value={d.avgScore} color="bg-blue-500" /></td>
                  <td className="px-4 py-3"><MetricBar value={d.dropOffRate} color="bg-red-400" /></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{d.avgCompletionDays}d</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{d.totalReviews}</td>
                  <td className="px-4 py-3 text-yellow-500">
                    {'★'.repeat(Math.round(d.avgRating))} <span className="text-gray-600 dark:text-gray-300">{d.avgRating}</span>
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
