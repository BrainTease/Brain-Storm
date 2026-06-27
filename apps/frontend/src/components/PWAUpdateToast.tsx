'use client';

import React, { useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';

/**
 * Component that displays a toast notification when a PWA update is available
 */
export function PWAUpdateToast() {
  const { updateAvailable, applyUpdate } = usePWA();
  const [showToast, setShowToast] = React.useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setShowToast(true);
    }
  }, [updateAvailable]);

  const handleUpdate = () => {
    applyUpdate();
    setShowToast(false);
    // Reload after service worker activation
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleDismiss = () => {
    setShowToast(false);
  };

  if (!showToast) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white rounded-lg shadow-lg p-4 max-w-sm animate-slide-in"
      role="status"
      aria-live="polite"
      aria-label="Update available notification"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">Update Available</p>
          <p className="text-xs text-blue-100 mt-1">
            A new version of Brain-Storm is ready to use.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="px-3 py-1 text-xs font-medium bg-blue-500 hover:bg-blue-700 rounded transition-colors"
            aria-label="Dismiss update notification"
          >
            Later
          </button>
          <button
            onClick={handleUpdate}
            className="px-3 py-1 text-xs font-medium bg-white text-blue-600 hover:bg-gray-100 rounded font-semibold transition-colors"
            aria-label="Apply update now"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
