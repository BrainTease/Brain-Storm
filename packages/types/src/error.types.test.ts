/**
 * Unit tests for error.types.ts
 *
 * Issue #1024: Covers the ErrorCode enum and type structure to achieve 90%+
 * coverage on runtime-emitting code in packages/types.
 */

import { ErrorCode } from './error.types';

describe('ErrorCode enum', () => {
  it('has VALIDATION_ERROR', () => {
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
  });

  it('has NOT_FOUND', () => {
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
  });

  it('has UNAUTHORIZED', () => {
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
  });

  it('has FORBIDDEN', () => {
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
  });

  it('has CONFLICT', () => {
    expect(ErrorCode.CONFLICT).toBe('CONFLICT');
  });

  it('has INTERNAL_ERROR', () => {
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });

  it('has EXTERNAL_SERVICE_ERROR', () => {
    expect(ErrorCode.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
  });

  it('has RATE_LIMIT_EXCEEDED', () => {
    expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('produces the expected set of error code values', () => {
    const values = Object.values(ErrorCode);
    expect(values).toEqual([
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'CONFLICT',
      'INTERNAL_ERROR',
      'EXTERNAL_SERVICE_ERROR',
      'RATE_LIMIT_EXCEEDED',
    ]);
  });

  it('can be used as a discriminant in a switch statement (type-level check)', () => {
    const code: ErrorCode = ErrorCode.NOT_FOUND;
    let matched = false;
    switch (code) {
      case ErrorCode.NOT_FOUND:
        matched = true;
        break;
      default:
        break;
    }
    expect(matched).toBe(true);
  });
});
