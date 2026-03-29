'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface Props {
  userId: string;
  stellarPublicKey?: string;
  onLinked: (key: string) => void;
  onUnlinked: () => void;
}

export default function WalletSection({ userId, stellarPublicKey, onLinked, onUnlinked }: Props) {
  const t = useTranslations('wallet');
  const [bstBalance, setBstBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [freighterMissing, setFreighterMissing] = useState(false);

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
      const { isConnected } = await import('@stellar/freighter-api').then((m) => m.isConnected());
      if (!isConnected) {
        setFreighterMissing(true);
        setLoading(false);
        return;
      }
      const { publicKey } = await import('@stellar/freighter-api').then((m) => m.getPublicKey());
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

  return (
    <section
      aria-labelledby="wallet-heading"
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4 bg-white dark:bg-gray-900"
    >
      <h2 id="wallet-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
        {t('title')}
      </h2>

      {stellarPublicKey ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-400 mb-1">{t('linkedKey')}</p>
            <code
              aria-label={t('publicKeyLabel', { key: stellarPublicKey })}
              className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 rounded break-all block"
            >
              {stellarPublicKey}
            </code>
          </div>
          {bstBalance !== null && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('bstBalance', { balance: Number(bstBalance).toLocaleString() })}
            </p>
          )}
          <Button variant="outline" onClick={unlinkWallet}>
            {t('unlinkWallet')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-400">{t('description')}</p>
          {freighterMissing && (
            <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
              {t('freighterMissing')}{' '}
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noreferrer"
                className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                {t('installFreighter')}
              </a>
            </p>
          )}
          <Button onClick={linkWallet} disabled={loading}>
            {loading ? t('connecting') : t('linkWallet')}
          </Button>
        </div>
      )}
    </section>
  );
}
