# Analytics Documentation

## Event Taxonomy

Brain-Storm uses a privacy-respecting event taxonomy for tracking user interactions across the platform.

### Event Categories

| Category | Description |
|----------|-------------|
| `discovery` | Course/instructor discovery and search |
| `profile` | User profile views and updates |
| `enrollment` | Course enrollment and progress |
| `tip` | Tip transactions |
| `review` | Review submissions and votes |
| `credential` | Credential issuance and verification |
| `auth` | Authentication events |

### Core Events

#### Discovery Funnel
- `discovery_page_view` - User views a page
- `discovery_search` - User performs a search
- `discovery_course_view` - User views a course detail
- `discovery_instructor_view` - User views an instructor profile

#### Profile Funnel
- `profile_view` - User views a profile
- `profile_update` - User updates their profile

#### Enrollment Funnel
- `enrollment_start` - User starts a course enrollment
- `enrollment_complete` - User completes a course
- `course_progress_update` - Progress percentage updates

#### Tip/Transaction Funnel
- `tip_initiated` - User initiates a tip
- `tip_sent` - Tip is successfully sent
- `tip_received` - Tip is received (server-side only)

#### Review Funnel
- `review_submitted` - User submits a review
- `review_voted` - User votes on a review

#### Credential Events
- `credential_issued` - Credential is issued on-chain
- `credential_verified` - Credential is verified

#### Auth Events
- `auth_login` - User logs in
- `auth_logout` - User logs out
- `auth_register` - User registers

## Event Schema

```typescript
interface AnalyticsEvent {
  eventId: string;          // UUID
  eventType: EventType;     // From CORE_EVENTS
  timestamp: string;        // ISO 8601
  userId?: string;          // Anonymized user ID
  sessionId: string;        // Session UUID
  source: 'web' | 'mobile' | 'api';
  locale?: string;          // Browser locale
  payload: Record<string, unknown>;  // Event-specific data (no PII)
}
```

## Privacy & Compliance

### PII Prohibition
The following fields are **never** included in analytics events:
- email, name, fullName, firstName, lastName
- phone, address, dateOfBirth
- password, secret, token, privateKey

### Consent Gating
- `analytics` consent is required for all events except marketing
- `marketing` consent is required for tip-related events

Consent is managed via:
- Backend: `EventsService.setConsent(userId, consent)`
- Frontend: `analytics.setConsent({ analytics: boolean, marketing: boolean })`

### Data Retention
- Analytics events are retained for 90 days
- Automatic cleanup runs daily at 3 AM UTC

## Implementation

### Frontend
```typescript
import { analytics, trackEvent, CORE_EVENTS } from '@/lib/analytics';

// Track a specific event
analytics.trackCourseView('course-123', 'Solidity Basics');

// Or use trackEvent directly
trackEvent(CORE_EVENTS.ENROLLMENT_START, { courseId: '123' });
```

### Backend
Events are automatically captured via NestJS event emitter:
```typescript
this.eventEmitter.emit('enrollment_start', { userId, courseId });
```

### Admin Analytics
Admin dashboards available at `/v1/admin/analytics` with:
- Date range filtering
- Growth metrics
- Tip volume
- Dispute rate
- CSV export

## Dashboard Metrics

The admin dashboard provides:
- `totalUsers` - Platform-wide user count
- `totalCourses` - Published courses count
- `totalEnrollments` - All enrollments
- `totalCompletions` - Completed courses
- `completionRate` - Percentage of completions
- `averageRating` - Average course rating
- `activeWorkers` - Users active in last 30 days
- `tipVolume` - Total tips in period
- `disputeRate` - Percentage of disputed transactions
- `growth` - User growth percentage vs previous period