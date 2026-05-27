'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

const FLAG_REASONS = [
  'Spam or advertising',
  'Offensive or inappropriate content',
  'Fake or misleading review',
  'Irrelevant to this course',
  'Other',
];

interface FlagModalProps {
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export function FlagModal({ onConfirm, onCancel }: FlagModalProps) {
  const [reason, setReason] = useState(FLAG_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const effectiveReason = reason === 'Other' ? customReason.trim() : reason;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveReason) return;
    setLoading(true);
    await onConfirm(effectiveReason);
    setLoading(false);
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

        <form onSubmit={handleSubmit} className="space-y-3">
          <fieldset>
            <legend className="sr-only">Reason for flagging</legend>
            <div className="space-y-2">
              {FLAG_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="flag-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-blue-600"
                  />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>

          {reason === 'Other' && (
            <textarea
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              maxLength={200}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Please describe your reason…"
              aria-label="Custom flag reason"
            />
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={loading || !effectiveReason}
              className="flex-1"
            >
              {loading ? 'Submitting…' : 'Submit Flag'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
