'use client';

import { useCallback, useState } from 'react';
import { Button } from './Button';

export function ChunkLoadError() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    window.location.reload();
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]"
    >
      <div className="text-5xl mb-4" aria-hidden="true">
        🔄
      </div>
      <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
        New version available
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        A new version of the app was deployed. Please refresh to get the latest update.
      </p>
      <Button onClick={handleRefresh} disabled={isRefreshing}>
        {isRefreshing ? 'Refreshing…' : 'Refresh Page'}
      </Button>
    </div>
  );
}
