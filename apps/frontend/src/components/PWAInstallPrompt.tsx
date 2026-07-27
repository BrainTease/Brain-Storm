'use client';

import React, { useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';

/**
 * Component that displays an install prompt for the PWA
 */
export function PWAInstallPrompt() {
  const { isInstallable, promptInstall } = usePWA();
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  useEffect(() => {
    if (isInstallable && !dismissed) {
      setShowPrompt(true);
    }
  }, [isInstallable, dismissed]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setShowPrompt(false);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal preference for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-4 max-w-sm animate-slide-in"
      role="status"
      aria-live="polite"
      aria-label="Install app notification"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">Install Brain-Storm</p>
          <p className="text-xs text-blue-100 mt-1">
            Add Brain-Storm to your home screen for offline access to your courses.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="px-3 py-1 text-xs font-medium bg-blue-500 hover:bg-blue-800 rounded transition-colors"
            aria-label="Dismiss install prompt"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="px-3 py-1 text-xs font-medium bg-white text-blue-600 hover:bg-gray-100 rounded font-semibold transition-colors"
            aria-label="Install app"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
