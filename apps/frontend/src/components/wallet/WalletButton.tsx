'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { WalletMenu } from './WalletMenu';
import { WalletSelectModal } from './WalletSelectModal';

export function WalletButton() {
  const { isConnected, truncatedAddress, isConnecting, error, networkMismatch, clearError } =
    useWallet();
  const [showMenu, setShowMenu] = useState(false);
  const [showSelect, setShowSelect] = useState(false);

  if (isConnected) {
    return (
      <div className="relative">
        {networkMismatch && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" title="Network mismatch" />
        )}
        <button
          data-tour="wallet-button"
          className="flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setShowMenu((v) => !v)}
          aria-expanded={showMenu}
          aria-haspopup="true"
        >
          <span
            className={`w-2 h-2 rounded-full ${networkMismatch ? 'bg-amber-400' : 'bg-green-500'}`}
            aria-hidden="true"
          />
          {truncatedAddress}
        </button>
        {showMenu && <WalletMenu onClose={() => setShowMenu(false)} />}
      </div>
    );
  }

  return (
    <div>
      <button
        className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
        onClick={() => setShowSelect(true)}
        disabled={isConnecting}
        aria-busy={isConnecting}
      >
        {isConnecting ? (
          <>
            <span
              className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            Connecting…
          </>
        ) : (
          'Connect Wallet'
        )}
      </button>
      {error && (
        <p className="text-xs text-red-600 mt-1">
          {error === 'FREIGHTER_NOT_INSTALLED' ? (
            <>
              Freighter not found.{' '}
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Install Freighter
              </a>{' '}
            </>
          ) : (
            error
          )}{' '}
          <button className="underline" onClick={clearError}>
            Dismiss
          </button>
        </p>
      )}
      {showSelect && <WalletSelectModal onClose={() => setShowSelect(false)} />}
    </div>
  );
}
