import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('soak_errors');
const responseTime = new Trend('soak_response_time');
const successCount = new Counter('soak_success');

export const options = {
  stages: [
    { duration: '5m', target: 25 },
    { duration: '30m', target: 25 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    'soak_response_time': ['p(95)<600', 'p(99)<1200'],
    'soak_errors': ['rate<0.05'],
  },
};

export default function () {
  group('Soak Test - Continuous Load', () => {
    const endpoints = [
      {
        name: 'List Courses',
        method: 'GET',
        url: 'http://localhost:3000/v1/courses',
      },
      {
        name: 'Get Course',
        method: 'GET',
        url: 'http://localhost:3000/v1/courses/550e8400-e29b-41d4-a716-446655440001',
      },
      {
        name: 'Get User Profile',
        method: 'GET',
        url: 'http://localhost:3000/v1/users/550e8400-e29b-41d4-a716-446655440000',
      },
    ];

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    const res = http.request(endpoint.method, endpoint.url, null, {
      headers: {
        Authorization: `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
      },
    });

    check(res, {
      [`${endpoint.name} status is 200`]: (r) => r.status === 200,
      [`${endpoint.name} response time < 600ms`]: (r) => r.timings.duration < 600,
    }) || errorRate.add(1);

    responseTime.add(res.timings.duration);
    if (res.status === 200) successCount.add(1);
  });

  sleep(2);
}
