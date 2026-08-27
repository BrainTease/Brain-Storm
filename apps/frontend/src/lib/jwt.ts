/**
 * Minimal JWT payload helpers.
 *
 * Only used to decide whether a persisted session is still worth keeping —
 * the backend remains the authority on token validity.
 */

export interface JwtPayload {
  sub?: string;
  exp?: number;
  [key: string]: unknown;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * A token is treated as expired when it cannot be decoded or its `exp` has
 * passed. Tokens without `exp` never expire client-side.
 */
export function isTokenExpired(
  token: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (!payload) return true;
  if (typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 <= now;
}
