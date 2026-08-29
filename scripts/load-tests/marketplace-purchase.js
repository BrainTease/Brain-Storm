import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * Marketplace Purchase Load Test (Issue #1029)
 *
 * Exercises the payment checkout and enrollment flow under realistic
 * concurrent load. Covers:
 *   1. POST /v1/payments/checkout  (Stripe checkout session creation)
 *   2. POST /v1/enrollments        (course enrollment after payment)
 *
 * Environment variables:
 *   API_URL       – Backend base URL (default: http://localhost:3000)
 *   AUTH_TOKEN    – Pre-authenticated JWT (optional; falls back to login flow)
 *   PROFILE       – Load profile: smoke | load | stress | spike (default: load)
 *   COURSE_ID     – Target course UUID for checkout (required)
 *   PRICE_ID      – Stripe price ID for the course (required)
 */

// ── Custom metrics ────────────────────────────────────────────────────────────

const checkoutSuccessRate = new Rate('checkout_success_rate');
const checkoutDuration = new Trend('checkout_duration', true);
const enrollmentSuccessRate = new Rate('enrollment_success_rate');
const enrollmentDuration = new Trend('enrollment_duration', true);

// ── Configuration ─────────────────────────────────────────────────────────────

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const COURSE_ID = __ENV.COURSE_ID || '';
const PRICE_ID = __ENV.PRICE_ID || '';

const PROFILES = {
  smoke: {
    stages: [
      { duration: '10s', target: 2 },
      { duration: '20s', target: 2 },
      { duration: '5s', target: 0 },
    ],
  },
  load: {
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 50 },
      { duration: '2m', target: 50 },
      { duration: '30s', target: 10 },
      { duration: '10s', target: 0 },
    ],
  },
  stress: {
    stages: [
      { duration: '30s', target: 20 },
      { duration: '1m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '1m', target: 100 },
      { duration: '30s', target: 0 },
    ],
  },
  spike: {
    stages: [
      { duration: '10s', target: 5 },
      { duration: '5s', target: 150 },
      { duration: '1m', target: 150 },
      { duration: '5s', target: 5 },
      { duration: '10s', target: 0 },
    ],
  },
};

const profile = __ENV.PROFILE || 'load';
const selectedProfile = PROFILES[profile] || PROFILES.load;

export const options = {
  ...selectedProfile,
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'],
    checkout_success_rate: ['rate>0.95'],
    checkout_duration: ['p(95)<500'],
    enrollment_success_rate: ['rate>0.95'],
    enrollment_duration: ['p(95)<400'],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAuthToken() {
  if (AUTH_TOKEN) return AUTH_TOKEN;

  // Attempt login with a test user
  const loginRes = http.post(
    `${BASE_URL}/v1/auth/login`,
    JSON.stringify({
      email: `loadtest-user-${__VU}@example.com`,
      password: 'loadtest-password-123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return body.access_token || '';
  }

  return '';
}

function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

// ── Scenario ──────────────────────────────────────────────────────────────────

export default function () {
  const token = getAuthToken();
  if (!token) {
    console.warn(`VU ${__VU}: no auth token, skipping iteration`);
    sleep(1);
    return;
  }

  // ── Step 1: Create checkout session ──────────────────────────────────────

  group('POST /v1/payments/checkout', () => {
    const payload = JSON.stringify({
      courseId: COURSE_ID,
      priceId: PRICE_ID,
      successUrl: 'https://app.brain-storm.com/success',
      cancelUrl: 'https://app.brain-storm.com/cancel',
    });

    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/v1/payments/checkout`, payload, authHeaders(token));
    const elapsed = Date.now() - startTime;

    checkoutDuration.add(elapsed);

    const passed = check(res, {
      'checkout: status is 200 or 201 or 409': (r) =>
        r.status === 200 || r.status === 201 || r.status === 409,
      'checkout: response time < 500ms': (r) => r.timings.duration < 500,
      'checkout: returns url or conflict': (r) => {
        if (r.status === 409) return true; // Idempotent conflict is acceptable
        try {
          const body = JSON.parse(r.body);
          return body.url !== undefined || body.sessionId !== undefined;
        } catch {
          return false;
        }
      },
    });

    checkoutSuccessRate.add(passed);
  });

  sleep(1);

  // ── Step 2: Enroll in course ─────────────────────────────────────────────

  group('POST /v1/enrollments', () => {
    const payload = JSON.stringify({
      courseId: COURSE_ID,
    });

    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/v1/enrollments`, payload, authHeaders(token));
    const elapsed = Date.now() - startTime;

    enrollmentDuration.add(elapsed);

    const passed = check(res, {
      'enrollment: status is 200, 201, or 409': (r) =>
        r.status === 200 || r.status === 201 || r.status === 409,
      'enrollment: response time < 400ms': (r) => r.timings.duration < 400,
      'enrollment: returns enrollment data on success': (r) => {
        if (r.status === 409) return true; // Already enrolled is fine
        try {
          const body = JSON.parse(r.body);
          return body.id !== undefined || body.userId !== undefined;
        } catch {
          return false;
        }
      },
    });

    enrollmentSuccessRate.add(passed);
  });

  sleep(2);
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    profile,
    vu_max: data.metrics.vuers ? data.metrics.vuers.values.max : 0,
    http_reqs: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
    http_req_duration_p95: data.metrics.http_req_duration
      ? data.metrics.http_req_duration.values['p(95)']
      : 0,
    http_req_duration_p99: data.metrics.http_req_duration
      ? data.metrics.http_req_duration.values['p(99)']
      : 0,
    http_req_failed_rate: data.metrics.http_req_failed
      ? data.metrics.http_req_failed.values.rate
      : 0,
    checkout_success_rate: data.metrics.checkout_success_rate
      ? data.metrics.checkout_success_rate.values.rate
      : 0,
    checkout_duration_p95: data.metrics.checkout_duration
      ? data.metrics.checkout_duration.values['p(95)']
      : 0,
    enrollment_success_rate: data.metrics.enrollment_success_rate
      ? data.metrics.enrollment_success_rate.values.rate
      : 0,
    enrollment_duration_p95: data.metrics.enrollment_duration
      ? data.metrics.enrollment_duration.values['p(95)']
      : 0,
  };

  const results = {};
  results[`load-test-results/marketplace-purchase-${profile}-${Date.now()}.json`] =
    JSON.stringify(summary, null, 2);
  results['stdout'] = formatSummary(summary);

  return results;
}

function formatSummary(s) {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Marketplace Purchase Load Test — ${s.profile}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Max VUs:            ${s.vu_max}
  Total Requests:     ${s.http_reqs}
  ─────────────────────────────────────────────
  HTTP p95:           ${s.http_req_duration_p95.toFixed(1)}ms
  HTTP p99:           ${s.http_req_duration_p99.toFixed(1)}ms
  HTTP Error Rate:    ${(s.http_req_failed_rate * 100).toFixed(2)}%
  ─────────────────────────────────────────────
  Checkout Success:   ${(s.checkout_success_rate * 100).toFixed(1)}%
  Checkout p95:       ${s.checkout_duration_p95.toFixed(1)}ms
  Enrollment Success: ${(s.enrollment_success_rate * 100).toFixed(1)}%
  Enrollment p95:     ${s.enrollment_duration_p95.toFixed(1)}ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}
