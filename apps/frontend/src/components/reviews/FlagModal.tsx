'use client';
import { useState } from 'react';
import { DisputeFlagStep } from './DisputeFlagStep';
import { createInitialDisputeState, getEffectiveReason, type FlagReason } from '@/services/disputeResolutionService';

interface FlagModalProps {
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export function FlagModal({ onConfirm, onCancel }: FlagModalProps) {
  const [reason, setReason] = useState<FlagReason>(createInitialDisputeState().reason as FlagReason);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const effectiveReason = getEffectiveReason(reason, customReason);
    setLoading(true);
    try {
      await onConfirm(effectiveReason);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="flag-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 space-y-4">
        <h2
          id="flag-modal-title"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          Flag Review
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Help us keep reviews helpful and relevant. Select a reason for flagging this review.
        </p>

        <DisputeFlagStep
          reason={reason}
          customReason={customReason}
          onReasonChange={setReason}
          onCustomReasonChange={setCustomReason}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          loading={loading}
        />
      </div>
    </div>
  );
}
