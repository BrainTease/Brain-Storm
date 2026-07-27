'use client';

import { useOfflineSync } from '@/hooks/useOfflineSync';

export function SyncStatusIndicator() {
  const { syncStatus } = useOfflineSync();

  if (syncStatus === 'online') return null;

  const styles: Record<string, string> = {
    offline: 'bg-red-500 text-white',
    syncing: 'bg-yellow-500 text-white',
    synced: 'bg-green-500 text-white',
  };

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-20 lg:bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium shadow-lg ${styles[syncStatus]}`}
    >
      {syncStatus === 'syncing' && (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
        </svg>
      )}
      {syncStatus === 'offline' && 'Offline'}
      {syncStatus === 'syncing' && 'Syncing...'}
      {syncStatus === 'synced' && 'Synced'}
    </div>
  );
}
