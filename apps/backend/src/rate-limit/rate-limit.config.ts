/**
 * Route-level throttle limits. Controllers reference these instead of repeating the numbers, so a
 * limit is changed in one place.
 */
export const THROTTLE = {
  /** 10 requests per minute: sign-in, token refresh and similar. */
  perMinute10: { default: { limit: 10, ttl: 60_000 } },
  /** 5 requests per minute: challenge and verification steps. */
  perMinute5: { default: { limit: 5, ttl: 60_000 } },
  /** 3 requests per hour: password and account recovery. */
  perHour3: { default: { limit: 3, ttl: 3_600_000 } },
  /** 3 requests per day: data export requests. */
  perDay3: { default: { limit: 3, ttl: 86_400_000 } },
  /** 1 request per day: account deletion requests. */
  perDay1: { default: { limit: 1, ttl: 86_400_000 } },
} as const;
