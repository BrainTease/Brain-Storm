'use client';

import { Button } from '@/components/ui/Button';
import {
  DISPUTE_FLAG_REASONS,
  type FlagReason,
  isValidReason,
  getEffectiveReason,
} from '@/services/disputeResolutionService';

interface DisputeFlagStepProps {
  reason: FlagReason;
  customReason: string;
  onReasonChange: (reason: FlagReason) => void;
  onCustomReasonChange: (reason: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function DisputeFlagStep({
  reason,
  customReason,
  onReasonChange,
  onCustomReasonChange,
  onSubmit,
  onCancel,
  loading = false,
}: DisputeFlagStepProps) {
  const effectiveReason = getEffectiveReason(reason, customReason);
  const isValid = isValidReason(reason, customReason);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) onSubmit();
      }}
      className="space-y-3"
    >
      <fieldset>
        <legend className="sr-only">Reason for flagging</legend>
        <div className="space-y-2">
          {DISPUTE_FLAG_REASONS.map((r) => (
            <label
              key={r}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              <input
                type="radio"
                name="flag-reason"
                value={r}
                checked={reason === r}
                onChange={() => onReasonChange(r)}
                className="accent-blue-600"
                disabled={loading}
              />
              {r}
            </label>
          ))}
        </div>
      </fieldset>

      {reason === 'Other' && (
        <textarea
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          rows={2}
          maxLength={200}
          value={customReason}
          onChange={(e) => onCustomReasonChange(e.target.value)}
          placeholder="Please describe your reason…"
          aria-label="Custom flag reason"
          disabled={loading}
        />
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading || !isValid} className="flex-1">
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
  );
}
