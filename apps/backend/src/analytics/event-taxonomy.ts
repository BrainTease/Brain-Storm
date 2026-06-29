/**
 * Event Taxonomy for Brain-Storm Analytics
 * 
 * Defines a privacy-respecting event schema and naming convention.
 * All events follow: category_action format
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

// Core funnel events
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

export type EventType = typeof CORE_EVENTS[keyof typeof CORE_EVENTS];

/**
 * Base event schema - PII fields are explicitly excluded
 */
export interface AnalyticsEvent {
  eventId: string;
  eventType: EventType;
  timestamp: string;
  userId?: string; // Anonymized, never PII
  sessionId: string;
  
  // Context
  source: 'web' | 'mobile' | 'api';
  locale?: string;
  
  // Event-specific payload (no PII)
  payload: Record<string, unknown>;
}

/**
 * PII fields that must NEVER be included in analytics events
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
 * Scrub PII from event payload
 */
export function scrubPII<T extends Record<string, unknown>>(payload: T): T {
  const scrubbed = { ...payload };
  for (const field of PII_FIELDS) {
    if (field in scrubbed) {
      delete (scrubbed as Record<string, unknown>)[field];
    }
  }
  // Recursively scrub nested objects
  for (const [key, value] of Object.entries(scrubbed)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      (scrubbed as Record<string, unknown>)[key] = scrubPII(value as Record<string, unknown>);
    }
  }
  return scrubbed;
}

// Marketing events requiring special consent
const MARKETING_EVENTS = ['tip_initiated', 'tip_sent'];

/**
 * Consent gating - events should only be sent if user consented
 */
export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

export function canSendEvent(consent: ConsentState, eventType: string): boolean {
  // Marketing events require marketing consent
  if (MARKETING_EVENTS.includes(eventType)) {
    return consent.marketing;
  }
  // All other events require basic analytics consent
  return consent.analytics;
}