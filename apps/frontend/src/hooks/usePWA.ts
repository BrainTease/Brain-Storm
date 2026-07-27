import { useEffect, useCallback, useRef, useState } from 'react';

interface PWAConfig {
  onUpdate?: () => void;
  onInstallPrompt?: (e: BeforeInstallPromptEvent) => void;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Hook to manage PWA installation, updates, and offline functionality
 */
export function usePWA(config: PWAConfig = {}) {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
      config.onInstallPrompt?.(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [config]);

  // Register service worker and handle updates
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        swRef.current = registration;

        // Check for updates periodically
        const checkForUpdates = () => {
          registration.update().catch(err => {
            console.debug('Service worker update check failed:', err);
          });
        };

        // Check on page focus
        const handleFocus = () => checkForUpdates();
        window.addEventListener('focus', handleFocus);

        // Check periodically (every 5 minutes)
        const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

        // Listen for controller change (indicates update applied)
        const handleControllerChange = () => {
          setUpdateAvailable(true);
          config.onUpdate?.();
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        // Listen for update available
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              config.onUpdate?.();
            }
          });
        });

        return () => {
          window.removeEventListener('focus', handleFocus);
          clearInterval(interval);
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    registerServiceWorker();
  }, [config]);

  // Trigger install prompt
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt.current) return false;

    try {
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;

      if (outcome === 'accepted') {
        deferredPrompt.current = null;
        setIsInstallable(false);
      }

      return outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }, []);

  // Apply pending update
  const applyUpdate = useCallback(async () => {
    if (!swRef.current?.waiting) return;

    swRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  return {
    isInstallable,
    updateAvailable,
    promptInstall,
    applyUpdate,
    deferredPrompt: deferredPrompt.current,
  };
}
