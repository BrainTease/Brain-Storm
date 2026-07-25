import { describe, it, expect } from 'vitest';
import { decodeJwt, isTokenExpired } from '@/lib/jwt';

function makeToken(payload: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

describe('decodeJwt', () => {
  it('returns the decoded payload', () => {
    expect(decodeJwt(makeToken({ sub: 'user-1', exp: 123 }))).toEqual({ sub: 'user-1', exp: 123 });
  });

  it('returns null for a malformed token', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull();
    expect(decodeJwt('header..signature')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  const now = 1_700_000_000_000;

  it('treats a missing token as expired', () => {
    expect(isTokenExpired(null, now)).toBe(true);
    expect(isTokenExpired(undefined, now)).toBe(true);
  });

  it('treats an undecodable token as expired', () => {
    expect(isTokenExpired('garbage', now)).toBe(true);
  });

  it('detects a token whose exp has passed', () => {
    expect(isTokenExpired(makeToken({ exp: now / 1000 - 60 }), now)).toBe(true);
  });

  it('accepts a token that is still valid', () => {
    expect(isTokenExpired(makeToken({ exp: now / 1000 + 60 }), now)).toBe(false);
  });

  it('keeps tokens that carry no exp claim', () => {
    expect(isTokenExpired(makeToken({ sub: 'user-1' }), now)).toBe(false);
  });
});
