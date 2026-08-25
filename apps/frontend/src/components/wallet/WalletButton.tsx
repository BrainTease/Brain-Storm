'use client';

import React from 'react';
import { useWallet } from '@/lib/wallet';
import { WalletConnectButton } from './WalletConnectButton';
import { AccountBadge } from './AccountBadge';
import { NetworkSelector } from './NetworkSelector';

export interface WalletButtonProps {
  className?: string;
  showNetwork?: boolean;
}

/**
 * Composite Wallet UI component that cleanly brings together:
 * - WalletConnectButton (when disconnected/connecting)
 * - AccountBadge (when connected)
 * - NetworkSelector (optional network indicator/switch)
 */
export function WalletButton({ className = '', showNetwork = false }: WalletButtonProps) {
  const { isConnected } = useWallet();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showNetwork && isConnected && <NetworkSelector compact />}
      {isConnected ? <AccountBadge /> : <WalletConnectButton />}
    </div>
  );
}

export default WalletButton;
