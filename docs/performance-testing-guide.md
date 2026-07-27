# Performance Testing Suite

## Overview

Performance testing ensures the Brain-Storm platform meets response time and throughput requirements under various load conditions. Tests include baselines, stress testing, and soak testing.

## Running Tests

### Performance Baseline
```bash
k6 run scripts/load-tests/performance-baseline.js
```

### Stress Test
```bash
k6 run scripts/load-tests/stress-test-advanced.js
```

### Soak Test
```bash
k6 run scripts/load-tests/soak-test.js
```

### All Tests
```bash
./scripts/load-tests/run-all-tests.sh
```

## Test Scenarios

### Performance Baseline
- **Duration:** 2 minutes
- **Ramp-up:** 0 → 10 → 50 users
- **Metrics:**
  - Response time p95 < 500ms
  - Response time p99 < 1000ms
  - Error rate < 10%

### Stress Test
- **Duration:** 16 minutes
- **Ramp-up:** 0 → 100 → 200 users
- **Metrics:**
  - Response time p95 < 1000ms
  - Response time p99 < 2000ms
  - Error rate < 20%

### Soak Test
- **Duration:** 40 minutes
- **Sustained:** 25 concurrent users
- **Metrics:**
  - Response time p95 < 600ms
  - Response time p99 < 1200ms
  - Error rate < 5%
  - Memory stability

## Endpoints Tested

- `POST /v1/auth/login` - Authentication
- `GET /v1/courses` - Course listing
- `GET /v1/courses/:id` - Course details
- `POST /v1/analytics/progress` - Progress tracking
- `GET /v1/stellar/balance/:publicKey` - Token balance

## Thresholds

| Metric | Baseline | Stress | Soak |
|--------|----------|--------|------|
| p95 Response Time | < 500ms | < 1000ms | < 600ms |
| p99 Response Time | < 1000ms | < 2000ms | < 1200ms |
| Error Rate | < 10% | < 20% | < 5% |

## CI/CD Integration

Performance tests run:
- On every push to main/develop
- On every PR
- Daily at 2 AM UTC

Results are uploaded as artifacts and compared against baseline.

## Analyzing Results

### View Results
```bash
k6 run script.js --out json=results.json
```

### Compare with Baseline
```bash
node scripts/compare-performance.js
```

### Generate HTML Report
```bash
npm install -g k6-reporter
k6-reporter results.json
```

## Best Practices

1. **Baseline First** - Establish baseline before stress testing
2. **Gradual Ramp-up** - Avoid sudden traffic spikes
3. **Monitor Resources** - Watch CPU, memory, and database
4. **Realistic Scenarios** - Test actual user workflows
5. **Regular Testing** - Run tests regularly to catch regressions
6. **Document Changes** - Record performance impacts of changes

## Troubleshooting

### High Error Rate
- Check backend logs
- Verify database connectivity
- Review resource limits

### Slow Response Times
- Profile database queries
- Check API implementation
- Review caching strategy

### Memory Leaks
- Run soak test longer
- Monitor memory growth
- Check for connection leaks

## Tools

- **k6** - Load testing framework
- **Grafana** - Visualization (optional)
- **InfluxDB** - Time-series database (optional)

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/load-testing/)
- [Thresholds and Limits](https://k6.io/docs/using-k6/thresholds/)
