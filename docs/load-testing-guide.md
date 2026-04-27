# Load Testing Guide

This guide covers load testing for Brain-Storm using k6, including realistic user journey scenarios and performance analysis.

## Prerequisites

### Installation

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6

# Or download from: https://k6.io/docs/getting-started/installation/
```

### Verify Installation

```bash
k6 version
```

## Running Load Tests

### Quick Start

```bash
# Run all load tests
./scripts/load-tests/run-all-tests.sh

# Run specific test
k6 run scripts/load-tests/user-journey.js

# Run with custom API URL
API_URL=https://api.example.com k6 run scripts/load-tests/user-journey.js
```

### Test Scenarios

#### 1. User Journey Test
**File**: `scripts/load-tests/user-journey.js`

Simulates realistic user flow:
1. Register new user
2. Login
3. Browse courses
4. View course details
5. Enroll in course
6. View user profile
7. Check Stellar balance

**Load Profile**:
- Ramp-up: 100 users over 2 minutes
- Sustained: 100 users for 5 minutes
- Spike: 500 users for 3 minutes
- Ramp-down: 0 users over 2 minutes

**Thresholds**:
- 95th percentile response time < 500ms
- 99th percentile response time < 1000ms
- Error rate < 5%

#### 2. High Concurrency Test
**File**: `scripts/load-tests/high-concurrency.js`

Tests system with high concurrent users:
- 1000 concurrent users for 10 minutes
- Spike to 10000 concurrent users for 5 minutes

**Workload**: Read-heavy (courses listing and details)

**Thresholds**:
- 95th percentile response time < 1000ms
- 99th percentile response time < 2000ms
- Error rate < 10%

#### 3. Stress Test
**File**: `scripts/load-tests/stress-test.js`

Gradually increases load to find breaking points:
- 100 → 200 → 500 → 1000 → 2000 → 5000 users
- Each stage lasts 2 minutes

**Workload**: Mix of read and write operations

**Thresholds**:
- 95th percentile response time < 2000ms
- 99th percentile response time < 5000ms
- Error rate < 20%

## Performance Metrics

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `http_req_duration` | Request duration | p95 < 500ms |
| `http_req_failed` | Failed requests | < 5% |
| `http_reqs` | Total requests | - |
| `http_req_blocked` | Time blocked | < 100ms |
| `http_req_connecting` | Connection time | < 100ms |
| `http_req_tls_handshaking` | TLS handshake | < 100ms |
| `http_req_sending` | Request sending | < 100ms |
| `http_req_waiting` | Server processing | < 300ms |
| `http_req_receiving` | Response receiving | < 100ms |
| `vus` | Virtual users | - |
| `vus_max` | Max virtual users | - |

### Interpreting Results

```
✓ http_req_duration: [p(95)=450ms p(99)=850ms]
  - 95% of requests completed in 450ms
  - 99% of requests completed in 850ms

✓ http_req_failed: rate=0.02
  - 2% of requests failed (acceptable)

✓ vus: 100
  - 100 concurrent virtual users
```

## Analysis & Bottleneck Identification

### Common Bottlenecks

1. **Database Queries**
   - Check slow query logs
   - Add indexes to frequently queried columns
   - Implement query caching

2. **API Response Time**
   - Profile endpoints
   - Optimize business logic
   - Add response caching

3. **Memory Usage**
   - Monitor memory consumption
   - Implement connection pooling
   - Optimize data structures

4. **Network Latency**
   - Check network conditions
   - Implement CDN
   - Optimize payload size

### Debugging Performance Issues

```bash
# Run with verbose logging
k6 run --verbose scripts/load-tests/user-journey.js

# Run with debug output
k6 run --debug scripts/load-tests/user-journey.js

# Run with specific VU count
k6 run -u 50 -d 30s scripts/load-tests/user-journey.js
```

## Generating Reports

### JSON Output

```bash
k6 run --out json=results.json scripts/load-tests/user-journey.js
```

### HTML Report (with extension)

```bash
# Install xk6-html extension
go install github.com/grafana/xk6-html@latest

# Run with HTML output
xk6 run --out html=report.html scripts/load-tests/user-journey.js
```

### Grafana Cloud Integration

```bash
# Set up Grafana Cloud
export K6_CLOUD_TOKEN=your_token

# Run test and send to Grafana Cloud
k6 run --cloud scripts/load-tests/user-journey.js
```

## Performance Optimization Tips

### 1. Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);

-- Use EXPLAIN to analyze queries
EXPLAIN ANALYZE SELECT * FROM courses WHERE status = 'published';
```

### 2. Caching Strategy
```typescript
// Implement Redis caching
const cachedCourses = await redis.get('courses:list');
if (!cachedCourses) {
  const courses = await db.courses.find();
  await redis.set('courses:list', JSON.stringify(courses), 'EX', 3600);
}
```

### 3. Connection Pooling
```typescript
// Configure connection pool
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 4. Response Compression
```typescript
// Enable gzip compression
app.use(compression());
```

## Continuous Load Testing

### CI/CD Integration

Add to `.github/workflows/ci.yml`:

```yaml
load-tests:
  name: Load Tests
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  
  steps:
    - uses: actions/checkout@v4
    - uses: grafana/setup-k6-action@v1
    - run: ./scripts/load-tests/run-all-tests.sh
      env:
        API_URL: http://localhost:3000
```

### Scheduled Testing

```bash
# Run load tests daily at 2 AM
0 2 * * * cd /path/to/brain-storm && ./scripts/load-tests/run-all-tests.sh
```

## Troubleshooting

### High Error Rate

1. Check backend logs
2. Verify database connectivity
3. Check rate limiting configuration
4. Increase timeout values

### Memory Issues

1. Reduce VU count
2. Implement connection pooling
3. Monitor memory usage
4. Check for memory leaks

### Timeout Errors

1. Increase timeout threshold
2. Check network latency
3. Optimize slow endpoints
4. Scale infrastructure

## Best Practices

1. **Test Regularly**: Run load tests before releases
2. **Baseline Metrics**: Establish performance baselines
3. **Progressive Load**: Gradually increase load
4. **Monitor Infrastructure**: Track CPU, memory, disk
5. **Document Results**: Keep historical data
6. **Optimize Iteratively**: Fix bottlenecks incrementally
7. **Test Realistically**: Simulate actual user behavior
8. **Automate Testing**: Integrate into CI/CD pipeline

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/load-testing/)
- [Performance Testing Guide](https://k6.io/docs/testing-guides/)
- [Grafana Cloud k6](https://grafana.com/products/cloud/k6/)

## Support

For issues or questions:
1. Check k6 documentation
2. Review load test results
3. Check backend logs
4. Create GitHub issue with details
