'use client';

import { useCallback, useEffect, useState } from 'react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  const handleOnline = useCallback(() => setOffline(false), []);
  const handleOffline = useCallback(() => setOffline(true), []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  if (!offline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 text-center text-sm font-medium px-4 py-2"
    >
      You are currently offline. Some features may be unavailable.
    </div>
  );
}
