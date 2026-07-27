import { useState, useEffect } from 'react';

type SyncStatus = 'online' | 'offline' | 'syncing' | 'synced';

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );

  useEffect(() => {
    const handleOnline = async () => {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        if (reg && 'sync' in reg) {
          await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync
            .register('progress-sync')
            .catch(() => null);
        }
      }
      setSyncStatus('syncing');
      setTimeout(() => {
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('online'), 3000);
      }, 2000);
    };

    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { syncStatus };
}
