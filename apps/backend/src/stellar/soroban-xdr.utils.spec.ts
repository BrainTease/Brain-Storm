import {
  decodeBigIntValue,
  decodeStringValue,
  decodeBooleanValue,
  decodeRawValue,
} from './soroban-xdr.utils';
import { SorobanRpc } from '@stellar/stellar-sdk';

describe('Soroban XDR Utils', () => {
  describe('decodeBigIntValue', () => {
    it('should decode a bigint return value', () => {
      const mockRetVal = { value: () => BigInt('1000000000') };
      const simResult = {
        result: { retval: mockRetVal },
      } as any;

      const result = decodeBigIntValue(simResult);
      expect(result).toBe('1000000000');
    });

    it('should return "0" for missing return value', () => {
      const simResult = { result: {} } as any;
      const result = decodeBigIntValue(simResult);
      expect(result).toBe('0');
    });

    it('should return "0" for undefined result', () => {
      const simResult = { result: null } as any;
      const result = decodeBigIntValue(simResult);
      expect(result).toBe('0');
    });

    it('should handle large bigint values', () => {
      const largeValue = BigInt('18446744073709551615'); // Max 64-bit unsigned
      const mockRetVal = { value: () => largeValue };
      const simResult = {
        result: { retval: mockRetVal },
      } as any;

      const result = decodeBigIntValue(simResult);
      expect(result).toBe('18446744073709551615');
    });

    it('should throw on invalid bigint conversion', () => {
      const mockRetVal = { value: () => 'invalid' };
      const simResult = {
        result: { retval: mockRetVal },
      } as any;

      expect(() => decodeBigIntValue(simResult)).toThrow(
        'Failed to decode bigint from Soroban response'
      );
    });
  });

  describe('decodeStringValue', () => {
    it('should decode a string return value', () => {
      const mockRetVal = { value: () => 'hello world' };
      const simResult = {
        result: { retval: mockRetVal },
      } as any;

      const result = decodeStringValue(simResult);
      expect(result).toBe('hello world');
    });

    it('should return undefined for missing return value', () => {
      const simResult = { result: {} } as any;
      const result = decodeStringValue(simResult);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined result', () => {
      const simResult = { result: null } as any;
      const result = decodeStringValue(simResult);
      expect(result).toBeUndefined();
    });
  });

  describe('decodeBooleanValue', () => {
    it('should decode a true boolean return value', () => {
      const mockRetVal = { value: () => true };
      const simResult = {
        result: { retval: mockRetVal },
      } as any;

      const result = decodeBooleanValue(simResult);
      expect(result).toBe(true);
    });

    it('should decode a false boolean return value', () => {
      const mockRetVal = { value: () => false };
      const simResult = {
        result: { retval: mockRetVal },
      } as any;

      const result = decodeBooleanValue(simResult);
      expect(result).toBe(false);
    });

    it('should return false for missing return value', () => {
      const simResult = { result: {} } as any;
      const result = decodeBooleanValue(simResult);
      expect(result).toBe(false);
    });
  });

  describe('decodeRawValue', () => {
    it('should return the raw scVal value', () => {
      const mockRetVal = { value: () => BigInt('12345') };
      const simResult = {
        result: { retval: mockRetVal },
      } as any;

      const result = decodeRawValue(simResult);
      expect(result).toBe(mockRetVal);
    });

    it('should return undefined for missing return value', () => {
      const simResult = { result: {} } as any;
      const result = decodeRawValue(simResult);
      expect(result).toBeUndefined();
    });
  });
});
