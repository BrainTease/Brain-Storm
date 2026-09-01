'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  StatsSkeleton,
  TableSkeleton,
  FormSkeleton,
  ListSkeleton,
} from '@/components/ui/SharedSkeletons';

// Each tab is rarely viewed alongside the others, so its component bundle
// only loads once that tab is selected rather than with the page shell.
const CourseAnalytics = dynamic(
  () => import('@/components/instructor/CourseAnalytics').then((m) => m.CourseAnalytics),
  { loading: () => <StatsSkeleton /> }
);
const StudentList = dynamic(
  () => import('@/components/instructor/StudentList').then((m) => m.StudentList),
  { loading: () => <TableSkeleton /> }
);
const CourseEditor = dynamic(
  () => import('@/components/instructor/CourseEditor').then((m) => m.CourseEditor),
  { loading: () => <FormSkeleton /> }
);
const EarningsPayouts = dynamic(
  () => import('@/components/instructor/EarningsPayouts').then((m) => m.EarningsPayouts),
  { loading: () => <TableSkeleton /> }
);
const MessagingPanel = dynamic(
  () => import('@/components/instructor/MessagingPanel').then((m) => m.MessagingPanel),
  { loading: () => <ListSkeleton /> }
);
const CoursePerformance = dynamic(
  () => import('@/components/instructor/CoursePerformance').then((m) => m.CoursePerformance),
  { loading: () => <StatsSkeleton /> }
);

type Tab = 'analytics' | 'students' | 'courses' | 'earnings' | 'messages' | 'performance';

const TABS: { value: Tab; label: string }[] = [
  { value: 'analytics', label: 'Analytics' },
  { value: 'students', label: 'Students' },
  { value: 'courses', label: 'Courses' },
  { value: 'earnings', label: 'Earnings' },
  { value: 'messages', label: 'Messages' },
  { value: 'performance', label: 'Performance' },
];

export default function InstructorDashboardPage() {
  const [tab, setTab] = useState<Tab>('analytics');

  return (
    <ProtectedRoute>
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Instructor Dashboard</h1>

        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`pb-2 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.value
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div>
          {tab === 'analytics' && <CourseAnalytics />}
          {tab === 'students' && <StudentList />}
          {tab === 'courses' && <CourseEditor />}
          {tab === 'earnings' && <EarningsPayouts />}
          {tab === 'messages' && <MessagingPanel />}
          {tab === 'performance' && <CoursePerformance />}
        </div>
      </main>
    </ProtectedRoute>
  );
}
