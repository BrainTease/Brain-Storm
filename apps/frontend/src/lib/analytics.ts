/**
 * Frontend Analytics Library
 * Privacy-respecting event instrumentation for core funnels
 */

import { v4 as uuidv4 } from 'uuid';

import { CORE_EVENTS, scrubPII, type EventType } from '../../../../packages/utils/src';

// The taxonomy, event type and PII scrubber are shared with the backend (#1543).
// Re-exported for existing consumers of this module.
export { CORE_EVENTS, EVENT_CATEGORIES, type EventType } from '../../../../packages/utils/src';

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

interface AnalyticsConfig {
  endpoint: string;
  consent: ConsentState;
  sessionId: string;
  userId?: string;
}

let config: AnalyticsConfig = {
  endpoint: '/v1/analytics/events',
  consent: { analytics: true, marketing: false },
  sessionId: '',
};

// Initialize session ID
if (typeof window !== 'undefined') {
  const stored = sessionStorage.getItem('analytics_session_id');
  config.sessionId = stored || uuidv4();
  sessionStorage.setItem('analytics_session_id', config.sessionId);
}

/**
 * Set user consent for analytics
 */
export function setConsent(consent: ConsentState): void {
  config.consent = consent;
}

/**
 * Get current consent state
 */
export function getConsent(): ConsentState {
  return config.consent;
}

/**
 * Set user ID (after login)
 */
export function setUserId(userId: string): void {
  config.userId = userId;
}

/**
 * Clear user ID (on logout)
 */
export function clearUserId(): void {
  config.userId = undefined;
}

/**
 * Check if event can be sent based on consent
 */
function canSendEvent(eventType: EventType): boolean {
  const marketingEvents = [CORE_EVENTS.TIP_INITIATED, CORE_EVENTS.TIP_SENT];
  if (marketingEvents.includes(eventType)) {
    return config.consent.marketing;
  }
  return config.consent.analytics;
}

/**
 * Track an analytics event
 */
export async function trackEvent(
  eventType: EventType,
  payload: Record<string, unknown> = {}
): Promise<void> {
  if (!canSendEvent(eventType)) {
    return;
  }

  const event = {
    eventId: uuidv4(),
    eventType,
    timestamp: new Date().toISOString(),
    userId: config.userId,
    sessionId: config.sessionId,
    source: 'web' as const,
    locale: typeof navigator !== 'undefined' ? navigator.language : undefined,
    payload: scrubPII(payload),
  };

  try {
    await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch (error) {
    // Analytics event failed silently
  }
}

// Convenience functions for common events
export const analytics = {
  trackPageView: (page: string, params?: Record<string, unknown>) =>
    trackEvent(CORE_EVENTS.PAGE_VIEW, { page, ...params }),

  trackSearch: (query: string, resultsCount?: number) =>
    trackEvent(CORE_EVENTS.SEARCH, { query, resultsCount }),

  trackCourseView: (courseId: string, courseTitle?: string) =>
    trackEvent(CORE_EVENTS.COURSE_VIEW, { courseId, courseTitle }),

  trackEnrollmentStart: (courseId: string) =>
    trackEvent(CORE_EVENTS.ENROLLMENT_START, { courseId }),

  trackEnrollmentComplete: (courseId: string) =>
    trackEvent(CORE_EVENTS.ENROLLMENT_COMPLETE, { courseId }),

  trackProgressUpdate: (courseId: string, progressPct: number) =>
    trackEvent(CORE_EVENTS.PROGRESS_UPDATE, { courseId, progressPct }),

  trackTipSent: (amount: number, recipientId: string) =>
    trackEvent(CORE_EVENTS.TIP_SENT, { amount, recipientId }),

  trackReviewSubmitted: (courseId: string, rating: number) =>
    trackEvent(CORE_EVENTS.REVIEW_SUBMITTED, { courseId, rating }),

  trackLogin: (method: string) => trackEvent(CORE_EVENTS.LOGIN, { method }),

  trackLogout: () => trackEvent(CORE_EVENTS.LOGOUT),

  trackRegister: (method: string) => trackEvent(CORE_EVENTS.REGISTER, { method }),
};

export default analytics;
