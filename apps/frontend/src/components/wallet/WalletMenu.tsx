'use client';

import { useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';

interface WalletMenuProps {
  onClose: () => void;
}

export function WalletMenu({ onClose }: WalletMenuProps) {
  const {
    address,
    balance,
    bstBalance,
    balanceError,
    network,
    networkMismatch,
    walletType,
    disconnect,
    refreshBalances,
  } = useWallet();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 z-50 space-y-3"
      role="menu"
    >
      <div>
        <p className="text-xs text-gray-500 mb-0.5">Connected Wallet</p>
        <p className="font-mono text-xs break-all">{address}</p>
        {walletType && (
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{walletType}</p>
        )}
      </div>

      {network && (
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Network</p>
          <p className={`text-xs font-medium ${networkMismatch ? 'text-amber-600' : 'text-gray-700 dark:text-gray-300'}`}>
            {network}
            {networkMismatch && ' — mismatch'}
          </p>
        </div>
      )}

      <div>
        <p className="text-xs text-gray-500 mb-0.5">XLM Balance</p>
        {balanceError ? (
          <p className="text-sm text-gray-500">
            Balance unavailable{' '}
            <button className="text-blue-600 underline text-xs" onClick={refreshBalances}>
              Retry
            </button>
          </p>
        ) : (
          <p className="text-sm font-medium">{balance ?? '—'} XLM</p>
        )}
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-0.5">BST Balance</p>
        <p className="text-sm font-medium">{bstBalance ?? '—'} BST</p>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button
          className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={() => { onClose(); }}
          role="menuitem"
        >
          Close
        </button>
        <button
          className="flex-1 text-sm border border-red-200 text-red-600 rounded-lg py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          onClick={() => { disconnect(); onClose(); }}
          role="menuitem"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
