'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { CourseAnalytics } from '@/components/instructor/CourseAnalytics';
import { StudentList } from '@/components/instructor/StudentList';
import { CourseEditor } from '@/components/instructor/CourseEditor';
import { EarningsPayouts } from '@/components/instructor/EarningsPayouts';
import { MessagingPanel } from '@/components/instructor/MessagingPanel';
import { CoursePerformance } from '@/components/instructor/CoursePerformance';

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
