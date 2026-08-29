import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useListingForm, listingSchema } from '@/hooks/useListingForm';

describe('useListingForm & listingSchema', () => {
  describe('Schema Validation Edge Cases', () => {
    it('validates a correct payload for create form', () => {
      const validPayload = {
        title: 'Mastering Rust and Soroban',
        description: 'Comprehensive smart contract course',
        price: 49.99,
        quantity: 10,
        currency: 'BST',
        royaltyBasis: 500,
      };

      const result = listingSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects negative price', () => {
      const invalidPayload = {
        title: 'Invalid Course',
        price: -10,
        quantity: 5,
      };

      const result = listingSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const priceError = result.error.issues.find((i) => i.path.includes('price'));
        expect(priceError).toBeDefined();
        expect(priceError?.message).toMatch(/greater than 0/i);
      }
    });

    it('rejects zero price', () => {
      const invalidPayload = {
        title: 'Zero Price Listing',
        price: 0,
        quantity: 1,
      };

      const result = listingSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const priceError = result.error.issues.find((i) => i.path.includes('price'));
        expect(priceError).toBeDefined();
        expect(priceError?.message).toMatch(/greater than 0/i);
      }
    });

    it('rejects zero quantity', () => {
      const invalidPayload = {
        title: 'Zero Qty Listing',
        price: 15.5,
        quantity: 0,
      };

      const result = listingSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const qtyError = result.error.issues.find((i) => i.path.includes('quantity'));
        expect(qtyError).toBeDefined();
        expect(qtyError?.message).toMatch(/at least 1/i);
      }
    });

    it('rejects negative quantity', () => {
      const invalidPayload = {
        title: 'Negative Qty Listing',
        price: 15.5,
        quantity: -3,
      };

      const result = listingSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const qtyError = result.error.issues.find((i) => i.path.includes('quantity'));
        expect(qtyError).toBeDefined();
      }
    });

    it('rejects decimal quantity', () => {
      const invalidPayload = {
        title: 'Decimal Qty Listing',
        price: 15.5,
        quantity: 1.5,
      };

      const result = listingSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const qtyError = result.error.issues.find((i) => i.path.includes('quantity'));
        expect(qtyError?.message).toMatch(/whole number/i);
      }
    });

    it('rejects empty title', () => {
      const invalidPayload = {
        title: '',
        price: 10,
        quantity: 1,
      };

      const result = listingSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const titleError = result.error.issues.find((i) => i.path.includes('title'));
        expect(titleError?.message).toMatch(/required/i);
      }
    });

    it('rejects royaltyBasis exceeding 10000 (100%)', () => {
      const invalidPayload = {
        title: 'Royalty Too High',
        price: 25,
        quantity: 1,
        royaltyBasis: 10001,
      };

      const result = listingSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const royaltyError = result.error.issues.find((i) => i.path.includes('royaltyBasis'));
        expect(royaltyError?.message).toMatch(/cannot exceed 10000/i);
      }
    });
  });

  describe('useListingForm Hook', () => {
    it('initializes with default values for create mode', () => {
      const { result } = renderHook(() =>
        useListingForm({
          mode: 'create',
          defaultValues: { title: 'Default Course' },
        })
      );

      expect(result.current.mode).toBe('create');
      expect(result.current.getValues('title')).toBe('Default Course');
      expect(result.current.getValues('quantity')).toBe(1);
      expect(result.current.getValues('currency')).toBe('BST');
    });

    it('initializes with existing listing values for edit mode', () => {
      const { result } = renderHook(() =>
        useListingForm({
          mode: 'edit',
          defaultValues: {
            title: 'Existing Course',
            description: 'Existing Description',
            price: 99.99,
            quantity: 5,
            currency: 'XLM',
            royaltyBasis: 250,
          },
        })
      );

      expect(result.current.mode).toBe('edit');
      expect(result.current.getValues('title')).toBe('Existing Course');
      expect(result.current.getValues('price')).toBe(99.99);
      expect(result.current.getValues('quantity')).toBe(5);
      expect(result.current.getValues('currency')).toBe('XLM');
      expect(result.current.getValues('royaltyBasis')).toBe(250);
    });

    it('provides validateValues utility helper', () => {
      const { result } = renderHook(() => useListingForm());
      const validation = result.current.validateValues({
        title: 'Valid',
        price: 20,
        quantity: 2,
      });

      expect(validation.success).toBe(true);
    });
  });
});
