'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { StatsSkeleton, TableSkeleton, ListSkeleton } from '@/components/ui/SharedSkeletons';

// Each admin tab is rarely viewed alongside the others, so its component
// bundle only loads once that tab is selected rather than with the page shell.
const StatsCards = dynamic(
  () => import('@/components/admin/StatsCards').then((m) => m.StatsCards),
  { loading: () => <StatsSkeleton /> }
);
const UserTable = dynamic(() => import('@/components/admin/UserTable').then((m) => m.UserTable), {
  loading: () => <TableSkeleton />,
});
const CourseApprovalList = dynamic(
  () => import('@/components/admin/CourseApprovalList').then((m) => m.CourseApprovalList),
  { loading: () => <ListSkeleton /> }
);
const SystemHealth = dynamic(
  () => import('@/components/admin/SystemHealth').then((m) => m.SystemHealth),
  { loading: () => <StatsSkeleton /> }
);
const ModerationQueue = dynamic(
  () => import('@/components/admin/ModerationQueue').then((m) => m.ModerationQueue),
  { loading: () => <ListSkeleton /> }
);

type AdminTab = 'stats' | 'users' | 'courses' | 'health' | 'moderation';

const TABS: { value: AdminTab; label: string }[] = [
  { value: 'stats', label: 'Statistics' },
  { value: 'users', label: 'Users' },
  { value: 'courses', label: 'Course Approvals' },
  { value: 'health', label: 'System Health' },
  { value: 'moderation', label: 'Moderation' },
];

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('stats');

  return (
    <main className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="flex gap-4 border-b mb-6">
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === t.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'stats' && <StatsCards />}
      {tab === 'users' && <UserTable />}
      {tab === 'courses' && <CourseApprovalList />}
      {tab === 'health' && <SystemHealth />}
      {tab === 'moderation' && <ModerationQueue />}
    </main>
  );
}
