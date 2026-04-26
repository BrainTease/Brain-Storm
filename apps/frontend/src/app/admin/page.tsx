'use client';
import { useState } from 'react';
import { StatsCards } from '@/components/admin/StatsCards';
import { UserTable } from '@/components/admin/UserTable';
import { CourseApprovalList } from '@/components/admin/CourseApprovalList';
import { SystemHealth } from '@/components/admin/SystemHealth';

type AdminTab = 'stats' | 'users' | 'courses' | 'health';

const TABS: { value: AdminTab; label: string }[] = [
  { value: 'stats', label: 'Statistics' },
  { value: 'users', label: 'Users' },
  { value: 'courses', label: 'Course Approvals' },
  { value: 'health', label: 'System Health' },
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
              tab === t.value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
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
    </main>
  );
}
