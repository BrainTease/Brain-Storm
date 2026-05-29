import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('stress_errors');
const responseTime = new Trend('stress_response_time');
const successCount = new Counter('stress_success');

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    'stress_response_time': ['p(95)<1000', 'p(99)<2000'],
    'stress_errors': ['rate<0.2'],
  },
};

export default function () {
  group('Stress Test - Analytics', () => {
    const analyticsRes = http.post(
      'http://localhost:3000/v1/analytics/progress',
      {
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        courseId: '550e8400-e29b-41d4-a716-446655440001',
        progressPercentage: Math.floor(Math.random() * 100),
      },
      {
        headers: {
          Authorization: `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
        },
      },
    );

    check(analyticsRes, {
      'analytics status is 201': (r) => r.status === 201,
      'analytics response time < 1000ms': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    responseTime.add(analyticsRes.timings.duration);
    if (analyticsRes.status === 201) successCount.add(1);
  });

  group('Stress Test - Token Queries', () => {
    const publicKey = 'GBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJJBBX7UYXNMWX5YSXF3ZCJXL';
    const tokenRes = http.get(`http://localhost:3000/v1/stellar/balance/${publicKey}`, {
      headers: {
        Authorization: `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
      },
    });

    check(tokenRes, {
      'token status is 200': (r) => r.status === 200,
      'token response time < 800ms': (r) => r.timings.duration < 800,
    }) || errorRate.add(1);

    responseTime.add(tokenRes.timings.duration);
    if (tokenRes.status === 200) successCount.add(1);
  });
}
