'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from '@/lib/toast';

type TxStep = 'build' | 'sign' | 'submit' | 'confirmed' | 'failed';

interface TransactionModalProps {
  xdr: string;
  description?: string;
  onClose: () => void;
  onSuccess?: (txHash: string) => void;
}

const HORIZON_BASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
    ? 'https://stellar.expert/explorer/public/tx'
    : 'https://stellar.expert/explorer/testnet/tx';

const STEP_LABELS: Record<TxStep, string> = {
  build: 'Review Transaction',
  sign: 'Signing…',
  submit: 'Submitting…',
  confirmed: 'Confirmed',
  failed: 'Failed',
};

async function submitToHorizon(signedXdr: string): Promise<string> {
  const body = new URLSearchParams({ tx: signedXdr });
  const res = await fetch(`${HORIZON_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    const code = data?.extras?.result_codes?.transaction;
    if (code === 'tx_insufficient_balance') throw new Error('Insufficient balance.');
    if (code === 'tx_bad_seq') throw new Error('Sequence number mismatch. Retry the transaction.');
    throw new Error(data?.title || 'Transaction failed.');
  }
  return data.hash as string;
}

async function pollForConfirmation(txHash: string, signal: AbortSignal): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (signal.aborted) throw new Error('Cancelled.');
    const res = await fetch(`${HORIZON_BASE}/transactions/${txHash}`);
    if (res.ok) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Confirmation timeout. Check explorer for status.');
}

export function TransactionModal({ xdr, description, onClose, onSuccess }: TransactionModalProps) {
  const { walletType, address } = useWallet();
  const [step, setStep] = useState<TxStep>('build');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step === 'build') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, step]);

  const run = useCallback(async () => {
    const ac = new AbortController();
    try {
      setStep('sign');
      let signedXdr: string;

      if (walletType === 'freighter') {
        const { signWithFreighter } = await import('@/lib/walletApi');
        const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'MAINNET' : 'TESTNET';
        signedXdr = await signWithFreighter(xdr, network);
      } else if (walletType === 'albedo') {
        const { signWithAlbedo } = await import('@/lib/walletAdapters');
        signedXdr = await signWithAlbedo(xdr);
      } else if (walletType === 'xbull') {
        const { signWithXbull } = await import('@/lib/walletAdapters');
        signedXdr = await signWithXbull(xdr);
      } else {
        throw new Error('No wallet connected.');
      }

      setStep('submit');
      const hash = await submitToHorizon(signedXdr);
      setTxHash(hash);

      await pollForConfirmation(hash, ac.signal);
      setStep('confirmed');
      toast.success('Transaction confirmed.');
      onSuccess?.(hash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error.';
      setErrorMessage(msg);
      setStep('failed');
      toast.error(msg);
    }
    return () => ac.abort();
  }, [walletType, xdr, onSuccess]);

  const isInProgress = step === 'sign' || step === 'submit';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Transaction"
    >
      <div className="fixed inset-0 bg-black/50" onClick={step === 'build' ? onClose : undefined} aria-hidden="true" />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{STEP_LABELS[step]}</h2>
          {!isInProgress && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Step progress */}
        <StepIndicator current={step} />

        {/* Content */}
        {step === 'build' && (
          <div className="space-y-3">
            {description && <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Signing as</p>
              <p className="font-mono text-xs break-all text-gray-700 dark:text-gray-300">{address}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 transition-colors"
                onClick={run}
              >
                Sign &amp; Submit
              </button>
            </div>
          </div>
        )}

        {isInProgress && (
          <div className="flex flex-col items-center gap-3 py-4">
            <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <p className="text-sm text-gray-500">
              {step === 'sign' ? 'Waiting for wallet signature…' : 'Broadcasting transaction…'}
            </p>
          </div>
        )}

        {step === 'confirmed' && txHash && (
          <div className="space-y-3 text-center">
            <p className="text-green-600 font-medium">Transaction confirmed!</p>
            <a
              href={`${EXPLORER_BASE}/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 underline"
            >
              View on Stellar Expert
            </a>
            <button
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}

        {step === 'failed' && (
          <div className="space-y-3">
            <p className="text-red-600 text-sm">{errorMessage}</p>
            <div className="flex gap-2">
              <button
                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 transition-colors"
                onClick={() => { setErrorMessage(null); run(); }}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: TxStep }) {
  const steps: { key: TxStep; label: string }[] = [
    { key: 'build', label: 'Review' },
    { key: 'sign', label: 'Sign' },
    { key: 'submit', label: 'Submit' },
    { key: 'confirmed', label: 'Done' },
  ];
  const order: TxStep[] = ['build', 'sign', 'submit', 'confirmed'];
  const currentIndex = order.indexOf(current === 'failed' ? 'submit' : current);

  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1 flex-1 last:flex-none">
          <div
            className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors ${
              i < currentIndex
                ? 'bg-blue-600 text-white'
                : i === currentIndex
                ? current === 'failed'
                  ? 'bg-red-500 text-white'
                  : 'bg-blue-600 text-white ring-2 ring-blue-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}
          >
            {i < currentIndex ? '✓' : i + 1}
          </div>
          <span className={`text-xs hidden sm:block ${i <= currentIndex ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mx-1 ${i < currentIndex ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
