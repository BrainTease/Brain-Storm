'use client';

import React, { useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { WalletMenu } from './WalletMenu';

export interface AccountBadgeProps {
  className?: string;
  showBalance?: boolean;
  onClick?: () => void;
}

export function AccountBadge({
  className = '',
  showBalance = false,
  onClick,
}: AccountBadgeProps) {
  const { isConnected, truncatedAddress, balance, networkMismatch } = useWallet();
  const [showMenu, setShowMenu] = useState(false);

  if (!isConnected || !truncatedAddress) {
    return null;
  }

  const handleToggle = () => {
    if (onClick) {
      onClick();
    } else {
      setShowMenu((prev) => !prev);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {networkMismatch && (
        <span
          data-testid="account-badge-mismatch-dot"
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white dark:border-gray-900"
          title="Network mismatch"
        />
      )}

      <button
        data-testid="account-badge"
        data-tour="wallet-button"
        className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={handleToggle}
        aria-expanded={showMenu}
        aria-haspopup="true"
        aria-label={`Connected account ${truncatedAddress}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            networkMismatch ? 'bg-amber-400' : 'bg-green-500'
          }`}
          aria-hidden="true"
        />

        <span className="font-mono text-xs font-medium text-gray-800 dark:text-gray-200">
          {truncatedAddress}
        </span>

        {showBalance && balance !== null && (
          <span className="text-xs text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700 pl-2">
            {balance} XLM
          </span>
        )}
      </button>

      {showMenu && <WalletMenu onClose={() => setShowMenu(false)} />}
    </div>
  );
}

export default AccountBadge;
