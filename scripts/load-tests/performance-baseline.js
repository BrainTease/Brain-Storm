import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const successCount = new Counter('success');
const activeUsers = new Gauge('active_users');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m30s', target: 50 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    'response_time': ['p(95)<500', 'p(99)<1000'],
    'errors': ['rate<0.1'],
  },
};

export default function () {
  activeUsers.add(1);

  group('Auth Flow', () => {
    const loginRes = http.post('http://localhost:3000/v1/auth/login', {
      email: 'test@example.com',
      password: 'SecurePass123!',
    });

    check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login response time < 500ms': (r) => r.timings.duration < 500,
      'has access token': (r) => r.json('accessToken') !== null,
    }) || errorRate.add(1);

    responseTime.add(loginRes.timings.duration);
    if (loginRes.status === 200) successCount.add(1);
  });

  sleep(1);

  group('Course Listing', () => {
    const coursesRes = http.get('http://localhost:3000/v1/courses', {
      headers: {
        Authorization: `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
      },
    });

    check(coursesRes, {
      'courses status is 200': (r) => r.status === 200,
      'courses response time < 300ms': (r) => r.timings.duration < 300,
      'has courses array': (r) => Array.isArray(r.json()),
    }) || errorRate.add(1);

    responseTime.add(coursesRes.timings.duration);
    if (coursesRes.status === 200) successCount.add(1);
  });

  sleep(1);

  group('Course Details', () => {
    const courseId = '550e8400-e29b-41d4-a716-446655440001';
    const courseRes = http.get(`http://localhost:3000/v1/courses/${courseId}`, {
      headers: {
        Authorization: `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
      },
    });

    check(courseRes, {
      'course status is 200': (r) => r.status === 200,
      'course response time < 400ms': (r) => r.timings.duration < 400,
      'has course data': (r) => r.json('id') !== null,
    }) || errorRate.add(1);

    responseTime.add(courseRes.timings.duration);
    if (courseRes.status === 200) successCount.add(1);
  });

  sleep(2);
  activeUsers.add(-1);
}
