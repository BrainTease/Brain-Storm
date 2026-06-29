/**
 * Network Status Hook
 * Monitors online/offline status and shows UI indicator
 */

import { useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';
import { processQueue, isOnline, getActionQueue } from './actionQueue';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: Network.NetworkStateType | null;
  pendingActions: number;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: false,
    type: null,
    pendingActions: 0,
  });

  const updateStatus = useCallback(async () => {
    const state = await Network.getNetworkStateAsync();
    const queue = await getActionQueue();
    
    setStatus({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type,
      pendingActions: queue.length,
    });
  }, []);

  useEffect(() => {
    updateStatus();
    
    // Poll for network status changes
    const interval = setInterval(updateStatus, 5000);
    
    // Listen for network changes
    const subscription = Network.addNetworkStateListener(updateStatus);
    
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [updateStatus]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (status.isConnected && status.pendingActions > 0) {
      // Sync will be triggered by the component using this hook
    }
  }, [status.isConnected, status.pendingActions]);

  return status;
}

/**
 * Network status indicator component props
 */
export interface OfflineBannerProps {
  isOnline: boolean;
  pendingActions: number;
  onSync?: () => void;
  syncing?: boolean;
}

/**
 * Simple offline banner component
 * Can be used in React Native apps
 */
export function OfflineBanner({ isOnline, pendingActions, onSync, syncing }: OfflineBannerProps) {
  if (isOnline && pendingActions === 0) {
    return null;
  }

  return (
    <div style={styles.banner}>
      <span>
        {isOnline 
          ? `${pendingActions} pending changes`
          : 'You are offline'
        }
      </span>
      {isOnline && pendingActions > 0 && (
        <button onClick={onSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync now'}
        </button>
      )}
    </div>
  );
}

const styles = {
  banner: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ff9800',
    color: 'white',
    padding: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 9999,
  },
};

export { isOnline, processQueue };