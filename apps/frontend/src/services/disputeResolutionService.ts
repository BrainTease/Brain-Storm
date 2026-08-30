import { DISPUTE_FLAG_REASONS } from '@brain-storm/types';
import type { FlagReason, DisputeState } from '@brain-storm/types';

export { DISPUTE_FLAG_REASONS } from '@brain-storm/types';
export type { FlagReason, DisputeState } from '@brain-storm/types';

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
