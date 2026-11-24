/**
 * Event Taxonomy for Brain-Storm Analytics
 *
 * Defines a privacy-respecting event schema and naming convention.
 * All events follow: category_action format
 */

import type { EventType } from '../../../../packages/utils/src';

// The taxonomy and PII rules live in the shared, framework-agnostic package
// (#1543). Re-exported here so existing `./event-taxonomy` imports keep working.
export {
  CORE_EVENTS,
  EVENT_CATEGORIES,
  type EventType,
  PII_FIELDS,
  scrubPII,
} from '../../../../packages/utils/src';

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
