'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { RadioGroup, TextArea } from '@/components/ui/form';

const FLAG_REASONS = [
  'Spam or advertising',
  'Offensive or inappropriate content',
  'Fake or misleading review',
  'Irrelevant to this course',
  'Other',
];

const REASON_OPTIONS = FLAG_REASONS.map((reason) => ({ value: reason, label: reason }));

interface FlagModalProps {
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export function FlagModal({ onConfirm, onCancel }: FlagModalProps) {
  const [reason, setReason] = useState<FlagReason>(
    createInitialDisputeState().reason as FlagReason
  );
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
    <Modal isOpen onClose={onCancel} title="Flag Review" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Help us keep reviews helpful and relevant. Select a reason for flagging this review.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <RadioGroup
            id="flag-reason"
            name="flag-reason"
            label="Reason for flagging"
            labelHidden
            options={REASON_OPTIONS}
            value={reason}
            onValueChange={setReason}
          />

          {reason === 'Other' && (
            <TextArea
              id="flag-custom-reason"
              size="sm"
              rows={2}
              maxLength={200}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Please describe your reason…"
              aria-label="Custom flag reason"
              className="resize-none"
            />
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={loading || !effectiveReason} className="flex-1">
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
    </Modal>
  );
}
