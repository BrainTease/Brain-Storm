import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Spike Test — validates system behaviour under sudden traffic surges
 * then confirms recovery after the spike drops.
 */

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '30s', target: 2000 },
    { duration: '3m', target: 2000 },
    { duration: '1m', target: 10 },
    { duration: '3m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.15'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/v1/courses`, {
    tags: { scenario: 'spike' },
  });

  check(res, {
    'status not 5xx': (r) => r.status < 500,
  });

  sleep(1);
}
