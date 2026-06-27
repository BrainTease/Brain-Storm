'use client';

import { useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { SUPPORTED_WALLETS } from '@/lib/walletAdapters';
import type { WalletType } from '@/store/walletStore';

interface WalletSelectModalProps {
  onClose: () => void;
}

export function WalletSelectModal({ onClose }: WalletSelectModalProps) {
  const { connect, isConnecting } = useWallet();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSelect(id: WalletType) {
    await connect(id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Select wallet"
    >
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Select Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <ul className="space-y-2" role="list">
          {SUPPORTED_WALLETS.map((wallet) => {
            const installed = wallet.isInstalled();
            const comingSoon = wallet.id === 'walletconnect';
            return (
              <li key={wallet.id}>
                <button
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                  onClick={() => handleSelect(wallet.id as WalletType)}
                  disabled={isConnecting || comingSoon}
                  aria-disabled={comingSoon}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {wallet.name}
                      {comingSoon && (
                        <span className="ml-2 text-xs text-gray-400">(coming soon)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{wallet.description}</p>
                  </div>
                  {installed ? (
                    <span className="shrink-0 text-xs text-green-600 font-medium">Detected</span>
                  ) : !comingSoon ? (
                    <a
                      href={wallet.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-blue-600 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Install
                    </a>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
