'use client';

import React from 'react';
import { useWallet, STELLAR_NETWORK, isExpectedNetwork } from '@/lib/wallet';

export interface NetworkSelectorProps {
  className?: string;
  showMismatchWarning?: boolean;
  compact?: boolean;
  onNetworkChange?: (network: string) => void;
}

const SUPPORTED_NETWORKS = [
  { id: 'TESTNET', label: 'Testnet', color: 'bg-green-500' },
  { id: 'PUBLIC', label: 'Mainnet', color: 'bg-blue-500' },
  { id: 'FUTURENET', label: 'Futurenet', color: 'bg-purple-500' },
];

export function NetworkSelector({
  className = '',
  showMismatchWarning = true,
  compact = false,
  onNetworkChange,
}: NetworkSelectorProps) {
  const { network, networkMismatch } = useWallet();
  const currentNetwork = network || STELLAR_NETWORK;
  const isMismatch = showMismatchWarning && (networkMismatch || !isExpectedNetwork(currentNetwork));

  return (
    <div
      data-testid="network-selector"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 ${
        isMismatch
          ? 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
          : 'text-gray-700 dark:text-gray-300'
      } ${className}`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          isMismatch ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
        }`}
        aria-hidden="true"
      />

      <span className="font-semibold uppercase tracking-wider">{currentNetwork}</span>

      {isMismatch && (
        <span
          data-testid="network-mismatch-badge"
          className="text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold"
          title="Connected network does not match expected network"
        >
          {compact ? '!' : 'Mismatch'}
        </span>
      )}
    </div>
  );
}

export default NetworkSelector;
