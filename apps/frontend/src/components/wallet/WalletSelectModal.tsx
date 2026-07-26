'use client';

import { useWallet } from '@/hooks/useWallet';
import { Modal } from '@/components/ui/Modal';
import { SUPPORTED_WALLETS } from '@/lib/walletAdapters';
import type { WalletType } from '@/store/walletStore';

interface WalletSelectModalProps {
  onClose: () => void;
}

export function WalletSelectModal({ onClose }: WalletSelectModalProps) {
  const { connect, isConnecting } = useWallet();

  async function handleSelect(id: WalletType) {
    await connect(id);
    onClose();
  }

  return (
    <Modal isOpen onClose={onClose} title="Select Wallet" size="sm">
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
    </Modal>
  );
}
