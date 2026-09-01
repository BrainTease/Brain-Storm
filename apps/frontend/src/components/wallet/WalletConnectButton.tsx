'use client';

import React, { useState } from 'react';
import { SUPPORTED_WALLETS, useWallet } from '@/lib/wallet';
import { WalletSelectModal } from './WalletSelectModal';

export interface WalletConnectButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onConnected?: () => void;
}

export function WalletConnectButton({
  className = '',
  size = 'md',
  onConnected,
}: WalletConnectButtonProps) {
  const { isConnected, isConnecting, error, clearError } = useWallet();
  const [showSelectModal, setShowSelectModal] = useState(false);

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }[size];

  if (isConnected) {
    return null;
  }

  const notInstalledAdapter =
    error?.code === 'NOT_INSTALLED' && error.walletId
      ? SUPPORTED_WALLETS.find((w) => w.id === error.walletId)
      : undefined;

  return (
    <div className="inline-flex flex-col">
      <button
        data-testid="wallet-connect-button"
        className={`flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-60 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${sizeClasses} ${className}`}
        onClick={() => setShowSelectModal(true)}
        disabled={isConnecting}
        aria-busy={isConnecting}
        aria-label="Connect Stellar Wallet"
      >
        {isConnecting ? (
          <>
            <span
              className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>Connecting…</span>
          </>
        ) : (
          <span>Connect Wallet</span>
        )}
      </button>

      {error && (
        <div
          data-testid="wallet-connect-error"
          className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-xs"
          role="alert"
        >
          {notInstalledAdapter ? (
            <>
              {notInstalledAdapter.name} not found.{' '}
              <a
                href={notInstalledAdapter.installUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-700"
              >
                Install {notInstalledAdapter.name}
              </a>
            </>
          ) : (
            error.message
          )}{' '}
          <button
            className="underline ml-1 font-semibold hover:text-red-800"
            onClick={clearError}
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {showSelectModal && (
        <WalletSelectModal
          onClose={() => {
            setShowSelectModal(false);
            if (onConnected && isConnected) onConnected();
          }}
        />
      )}
    </div>
  );
}

export default WalletConnectButton;
