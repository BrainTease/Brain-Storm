import { describe, it, expect } from 'vitest';
import {
  DISPUTE_FLAG_REASONS,
  getEffectiveReason,
  isValidReason,
  createInitialDisputeState,
  type FlagReason,
} from '@/services/disputeResolutionService';

describe('disputeResolutionService', () => {
  describe('DISPUTE_FLAG_REASONS', () => {
    it('should have predefined flag reasons', () => {
      expect(DISPUTE_FLAG_REASONS).toContain('Spam or advertising');
      expect(DISPUTE_FLAG_REASONS).toContain('Offensive or inappropriate content');
      expect(DISPUTE_FLAG_REASONS).toContain('Fake or misleading review');
      expect(DISPUTE_FLAG_REASONS).toContain('Irrelevant to this course');
      expect(DISPUTE_FLAG_REASONS).toContain('Other');
    });
  });

  describe('getEffectiveReason', () => {
    it('should return the reason for non-other flags', () => {
      const reason: FlagReason = 'Spam or advertising';
      const result = getEffectiveReason(reason, '');

      expect(result).toBe('Spam or advertising');
    });

    it('should return custom reason for "Other" flag', () => {
      const reason: FlagReason = 'Other';
      const custom = 'This is a custom reason';

      const result = getEffectiveReason(reason, custom);

      expect(result).toBe('This is a custom reason');
    });

    it('should trim whitespace from custom reason', () => {
      const reason: FlagReason = 'Other';
      const custom = '  custom reason with spaces  ';

      const result = getEffectiveReason(reason, custom);

      expect(result).toBe('custom reason with spaces');
    });
  });

  describe('isValidReason', () => {
    it('should return true for non-empty predefined reason', () => {
      const reason: FlagReason = 'Spam or advertising';
      const result = isValidReason(reason, '');

      expect(result).toBe(true);
    });

    it('should return false for "Other" with empty custom reason', () => {
      const reason: FlagReason = 'Other';
      const result = isValidReason(reason, '');

      expect(result).toBe(false);
    });

    it('should return false for "Other" with only whitespace', () => {
      const reason: FlagReason = 'Other';
      const result = isValidReason(reason, '   ');

      expect(result).toBe(false);
    });

    it('should return true for "Other" with valid custom reason', () => {
      const reason: FlagReason = 'Other';
      const result = isValidReason(reason, 'Valid custom reason');

      expect(result).toBe(true);
    });
  });

  describe('createInitialDisputeState', () => {
    it('should create state with default values', () => {
      const state = createInitialDisputeState();

      expect(state).toEqual({
        step: 'collect_reason',
        reason: 'Spam or advertising',
        customReason: '',
        error: null,
      });
    });
  });
});
