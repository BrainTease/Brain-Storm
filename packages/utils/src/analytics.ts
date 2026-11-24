/**
 * Framework-agnostic analytics taxonomy and PII scrubbing.
 *
 * Shared by the backend analytics service and the frontend telemetry client
 * so the event vocabulary and privacy rules cannot drift apart (#1543).
 */

export const EVENT_CATEGORIES = {
  USER: 'user',
  COURSE: 'course',
  ENROLLMENT: 'enrollment',
  CREDENTIAL: 'credential',
  TIP: 'tip',
  REVIEW: 'review',
  DISCOVERY: 'discovery',
} as const;

export const CORE_EVENTS = {
  // Discovery funnel
  PAGE_VIEW: 'discovery_page_view',
  SEARCH: 'discovery_search',
  COURSE_VIEW: 'discovery_course_view',
  INSTRUCTOR_VIEW: 'discovery_instructor_view',

  // Profile funnel
  PROFILE_VIEW: 'profile_view',
  PROFILE_UPDATE: 'profile_update',

  // Enrollment funnel
  ENROLLMENT_START: 'enrollment_start',
  ENROLLMENT_COMPLETE: 'enrollment_complete',
  PROGRESS_UPDATE: 'course_progress_update',

  // Tip/Transaction funnel
  TIP_INITIATED: 'tip_initiated',
  TIP_SENT: 'tip_sent',
  TIP_RECEIVED: 'tip_received',

  // Review funnel
  REVIEW_SUBMITTED: 'review_submitted',
  REVIEW_VOTED: 'review_voted',

  // Credential events
  CREDENTIAL_ISSUED: 'credential_issued',
  CREDENTIAL_VERIFIED: 'credential_verified',

  // Auth events
  LOGIN: 'auth_login',
  LOGOUT: 'auth_logout',
  REGISTER: 'auth_register',
} as const;

export type EventType = (typeof CORE_EVENTS)[keyof typeof CORE_EVENTS];

/**
 * PII fields that must never be included in analytics events.
 * Kept as a superset of both former copies (including `privateKey`).
 */
export const PII_FIELDS = [
  'email',
  'name',
  'fullName',
  'firstName',
  'lastName',
  'phone',
  'address',
  'dateOfBirth',
  'ssn',
  'password',
  'secret',
  'token',
  'privateKey',
];

/**
 * Recursively remove PII fields from an event payload.
 */
export function scrubPII<T extends Record<string, unknown>>(payload: T): T {
  const scrubbed = { ...payload };
  for (const field of PII_FIELDS) {
    delete (scrubbed as Record<string, unknown>)[field];
  }
  for (const [key, value] of Object.entries(scrubbed)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      (scrubbed as Record<string, unknown>)[key] = scrubPII(
        value as Record<string, unknown>
      );
    }
  }
  return scrubbed;
}
