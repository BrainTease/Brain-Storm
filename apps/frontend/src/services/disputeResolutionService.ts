export const DISPUTE_FLAG_REASONS = [
  'Spam or advertising',
  'Offensive or inappropriate content',
  'Fake or misleading review',
  'Irrelevant to this course',
  'Other',
] as const;

export type FlagReason = (typeof DISPUTE_FLAG_REASONS)[number];

export interface DisputeState {
  step: 'collect_reason' | 'submitting' | 'confirmed' | 'failed';
  reason: FlagReason;
  customReason: string;
  error: string | null;
}

export function getEffectiveReason(reason: FlagReason, customReason: string): string {
  return reason === 'Other' ? customReason.trim() : reason;
}

export function isValidReason(reason: FlagReason, customReason: string): boolean {
  const effective = getEffectiveReason(reason, customReason);
  return effective.length > 0;
}

export function createInitialDisputeState(): DisputeState {
  return {
    step: 'collect_reason',
    reason: DISPUTE_FLAG_REASONS[0],
    customReason: '',
    error: null,
  };
}
