'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { TokenBalance } from '@/components/ui/TokenBalance';
import { useFreighterDetection } from '@/hooks/useFreighterDetection';
import api from '@/lib/api';

interface Props {
  userId: string;
  stellarPublicKey?: string;
  onLinked: (key: string) => void;
  onUnlinked: () => void;
}

// eslint-disable-next-line max-lines-per-function -- profile wallet card; split in a follow-up
export default function WalletSection({ userId, stellarPublicKey, onLinked, onUnlinked }: Props) {
  const [bstBalance, setBstBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [freighterMissing, setFreighterMissing] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundMessage, setFundMessage] = useState<string | null>(null);
  const { detectFreighter, getPublicKey } = useFreighterDetection();

  useEffect(() => {
    if (stellarPublicKey) {
      api
        .get(`/stellar/balance/${stellarPublicKey}`)
        .then((r) => {
          const bst = r.data.balances?.find(
            (b: { asset_code: string; balance: string }) => b.asset_code === 'BST'
          );
          setBstBalance(bst?.balance ?? '0');
        })
        .catch(() => setBstBalance('0'));
    }
  }, [stellarPublicKey]);

  const linkWallet = async () => {
    setLoading(true);
    setFreighterMissing(false);
    try {
      const detection = await detectFreighter();
      if (detection.status === 'missing') {
        setFreighterMissing(true);
        setLoading(false);
        return;
      }
      const publicKey = await getPublicKey();
      await api.patch(`/users/${userId}`, { stellarPublicKey: publicKey });
      onLinked(publicKey);
    } catch {
      setFreighterMissing(true);
    } finally {
      setLoading(false);
    }
  };

  const unlinkWallet = async () => {
    await api.patch(`/users/${userId}`, { stellarPublicKey: null });
    setBstBalance(null);
    onUnlinked();
  };

  const fundTestnet = async () => {
    if (!stellarPublicKey) return;
    setFunding(true);
    setFundMessage(null);
    try {
      await api.post('/stellar/fund-testnet', { publicKey: stellarPublicKey });
      setFundMessage('Account funded successfully!');
    } catch {
      setFundMessage('Funding failed. Try again.');
    } finally {
      setFunding(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold">Stellar Wallet</h2>

      {stellarPublicKey ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 mb-1">Linked public key</p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
              {stellarPublicKey}
            </code>
          </div>
          {bstBalance !== null && (
            <p className="text-sm">
              BST Balance:{' '}
              <TokenBalance
                balance={bstBalance}
                symbol="BST"
                decimals={7}
                className="font-semibold"
              />
            </p>
          )}
          <Button variant="outline" onClick={unlinkWallet}>
            Unlink Wallet
          </Button>
          {process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'testnet' && (
            <div className="space-y-1">
              <Button variant="outline" onClick={fundTestnet} disabled={funding}>
                {funding ? 'Funding…' : 'Fund Testnet Account'}
              </Button>
              {fundMessage && <p className="text-sm text-gray-600">{fundMessage}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Link your Freighter wallet to receive credentials and BST tokens.
          </p>
          {freighterMissing && (
            <p className="text-sm text-amber-600">
              Freighter not detected.{' '}
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Install Freighter
              </a>
            </p>
          )}
          <Button onClick={linkWallet} disabled={loading}>
            {loading ? 'Connecting…' : 'Link Wallet'}
          </Button>
        </div>
      )}
    </div>
  );
}
