'use client';

import { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SettingsNav } from '@/components/settings/SettingsNav';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <main className="max-w-5xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>
        <div className="flex gap-8">
          <SettingsNav />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
