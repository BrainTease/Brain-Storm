# Load & Stress Testing for Brain-Storm API

Comprehensive load and stress testing using k6 for the Brain-Storm platform, with a focus on search and discovery endpoints.

## Overview

This directory contains k6 scripts for testing API performance under various load conditions, with predefined thresholds for latency and error rates.

## Directory Structure

```
packages/api/load/
├── README.md                    # This file
├── scenarios/                   # Test scenarios
│   ├── search-discovery.js      # Search & discovery endpoints
│   ├── course-browsing.js       # Course browsing scenarios
│   ├── user-workflows.js        # User journey scenarios
│   └── auth-flows.js            # Authentication flows
├── config/                      # Configuration files
│   ├── thresholds.js            # SLO thresholds
│   ├── stages.js                # Load profiles
│   └── environment.js           # Environment config
├── utils/                       # Utility functions
│   ├── auth.js                  # Authentication helpers
│   ├── generators.js            # Data generators
│   └── checks.js                # Common checks
├── reports/                     # Test results (gitignored)
│   ├── summary/
│   ├── detailed/
│   └── trends/
└── baselines/                   # Performance baselines
    ├── search-baseline.json
    ├── discovery-baseline.json
    └── README.md
```

## Prerequisites

### Install k6

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6:latest
```

### Verify Installation

```bash
k6 version
```

## Quick Start

### Run Individual Test

```bash
# Search & discovery endpoints
k6 run packages/api/load/scenarios/search-discovery.js

# Course browsing
k6 run packages/api/load/scenarios/course-browsing.js

# Full user workflow
k6 run packages/api/load/scenarios/user-workflows.js
```

### Run with Custom Environment

```bash
# Against staging
K6_API_URL=https://staging-api.brain-storm.com k6 run packages/api/load/scenarios/search-discovery.js

# Against local
K6_API_URL=http://localhost:3000 k6 run packages/api/load/scenarios/search-discovery.js
```

### Run with Different Load Profiles

```bash
# Smoke test (minimal load)
k6 run --env PROFILE=smoke packages/api/load/scenarios/search-discovery.js

# Load test (normal load)
k6 run --env PROFILE=load packages/api/load/scenarios/search-discovery.js

# Stress test (high load)
k6 run --env PROFILE=stress packages/api/load/scenarios/search-discovery.js

# Spike test (sudden load increase)
k6 run --env PROFILE=spike packages/api/load/scenarios/search-discovery.js

# Soak test (sustained load)
k6 run --env PROFILE=soak packages/api/load/scenarios/search-discovery.js
```

## Load Profiles

### Smoke Test

- **Purpose**: Verify script works and basic functionality
- **Load**: 1-5 VUs for 1 minute
- **When**: After any script changes

### Load Test

- **Purpose**: Assess performance under normal conditions
- **Load**: Ramp up to 100 VUs over 5 minutes, sustain for 10 minutes
- **When**: Before releases, nightly

### Stress Test

- **Purpose**: Find the breaking point
- **Load**: Gradually increase to 500+ VUs
- **When**: Weekly, before major releases

### Spike Test

- **Purpose**: Test sudden traffic increases
- **Load**: Sudden jump to 500 VUs for 2 minutes
- **When**: Before marketing campaigns

### Soak Test

- **Purpose**: Test stability over time
- **Load**: 50 VUs for 2-4 hours
- **When**: Before releases, monthly

## SLO Thresholds

Our Service Level Objectives (SLOs) for API endpoints:

### Search & Discovery Endpoints

| Endpoint                  | P95 Latency | P99 Latency | Error Rate | Throughput  |
| ------------------------- | ----------- | ----------- | ---------- | ----------- |
| `/api/search/courses`     | < 300ms     | < 500ms     | < 1%       | > 50 req/s  |
| `/api/courses`            | < 200ms     | < 400ms     | < 0.5%     | > 100 req/s |
| `/api/courses/:id`        | < 150ms     | < 300ms     | < 0.5%     | > 150 req/s |
| `/api/search/instructors` | < 250ms     | < 450ms     | < 1%       | > 30 req/s  |
| `/api/tags`               | < 100ms     | < 200ms     | < 0.1%     | > 200 req/s |
| `/api/categories`         | < 100ms     | < 200ms     | < 0.1%     | > 200 req/s |

### Other Critical Endpoints

| Endpoint             | P95 Latency | P99 Latency | Error Rate |
| -------------------- | ----------- | ----------- | ---------- |
| `/api/auth/login`    | < 500ms     | < 1000ms    | < 2%       |
| `/api/auth/register` | < 800ms     | < 1500ms    | < 2%       |
| `/api/enrollments`   | < 400ms     | < 800ms     | < 1%       |
| `/api/user/profile`  | < 200ms     | < 400ms     | < 0.5%     |

## Test Scenarios

### 1. Search & Discovery (`search-discovery.js`)

Tests search and discovery functionality:

- Course search with various queries
- Instructor search
- Tag-based filtering
- Category browsing
- Faceted search
- Auto-complete suggestions

**Key Metrics**:

- Search response time
- Result relevance (via status codes)
- Cache hit rates
- Database query performance

### 2. Course Browsing (`course-browsing.js`)

Tests course listing and detail views:

- Browse all courses
- Filter by category
- Sort by various criteria
- View course details
- Check prerequisites
- View course content

**Key Metrics**:

- Page load times
- API response times
- Cache effectiveness
- Database query count

### 3. User Workflows (`user-workflows.js`)

Complete user journeys:

1. Register → Login
2. Browse courses → Search
3. View details → Enroll
4. Access course → View progress
5. Complete quiz → Get certificate

**Key Metrics**:

- End-to-end flow time
- Success rate
- Step completion rate
- User experience metrics

### 4. Authentication Flows (`auth-flows.js`)

Authentication and authorization:

- User registration
- User login
- Token refresh
- Password reset
- Session management

**Key Metrics**:

- Auth latency
- Token generation time
- Session validation speed
- Error rates

## Running Tests

### Local Development

```bash
# Start backend API locally
npm run start:dev --workspace=apps/backend

# Run load tests in another terminal
k6 run packages/api/load/scenarios/search-discovery.js
```

### Staging Environment

```bash
# Set staging URL
export K6_API_URL=https://staging-api.brain-storm.com

# Run tests
k6 run packages/api/load/scenarios/search-discovery.js
```

### CI/CD Integration

Tests run automatically:

- **Nightly**: Full suite against staging
- **On PR**: Smoke tests only
- **Pre-release**: Comprehensive suite

## Analyzing Results

### Terminal Output

k6 provides real-time metrics:

```
✓ search response time < 300ms
✓ search success rate > 99%
✓ discovery response time < 200ms

http_req_duration..............: avg=180ms min=45ms med=150ms max=850ms p(90)=250ms p(95)=300ms
http_req_failed................: 0.12% ✓ 6 ✗ 4994
http_reqs......................: 5000 requests (250/s)
vus............................: 50 min=10 max=100
```

### JSON Reports

```bash
# Generate JSON report
k6 run --out json=reports/search-results.json packages/api/load/scenarios/search-discovery.js

# Parse results
node scripts/parse-k6-results.js reports/search-results.json
```

### HTML Reports

```bash
# Generate HTML report (requires xk6-reporter)
k6 run --out html=reports/search-report.html packages/api/load/scenarios/search-discovery.js
```

### Trend Analysis

```bash
# Compare against baseline
node packages/api/load/utils/compare-baseline.js reports/search-results.json baselines/search-baseline.json
```

## Performance Baselines

Baseline files track expected performance over time.

### Updating Baselines

```bash
# Run test and save as new baseline
k6 run --out json=baselines/search-baseline.json packages/api/load/scenarios/search-discovery.js

# Commit baseline to git
git add baselines/search-baseline.json
git commit -m "chore: update search performance baseline"
```

### Baseline Comparison

Automated comparison in CI:

- **Regression**: > 10% slower than baseline → ❌ Fail
- **Warning**: 5-10% slower → ⚠️ Warning
- **Acceptable**: < 5% difference → ✅ Pass
- **Improvement**: Faster than baseline → 🎉 Celebrate

## Interpreting Metrics

### Response Time Metrics

- **avg**: Average response time
- **min**: Fastest response
- **max**: Slowest response
- **med**: Median (50th percentile)
- **p(90)**: 90% of requests faster than this
- **p(95)**: 95% of requests faster than this (our SLO)
- **p(99)**: 99% of requests faster than this

### HTTP Metrics

- **http_reqs**: Total number of HTTP requests
- **http_req_blocked**: Time spent blocked before request
- **http_req_connecting**: Time spent establishing TCP connection
- **http_req_tls_handshaking**: Time spent in TLS handshake
- **http_req_sending**: Time spent sending request
- **http_req_waiting**: Time spent waiting for response (TTFB)
- **http_req_receiving**: Time spent receiving response
- **http_req_duration**: Total request time (sending + waiting + receiving)
- **http_req_failed**: Rate of failed requests

### Virtual Users

- **vus**: Current number of active virtual users
- **vus_max**: Maximum number of VUs reached

## Troubleshooting

### High Latency

1. **Check Database**: Slow queries? Missing indexes?
2. **Check Caching**: Cache hit rate low?
3. **Check Network**: High network latency?
4. **Check Resources**: CPU/memory maxed out?

### High Error Rate

1. **Check Logs**: What errors are occurring?
2. **Check Rate Limits**: Hitting rate limits?
3. **Check Auth**: Authentication failures?
4. **Check Timeouts**: Requests timing out?

### Inconsistent Results

1. **External Dependencies**: Third-party APIs slow?
2. **Database State**: Test data causing issues?
3. **Caching**: Cache warming up?
4. **Load Balancing**: Uneven distribution?

## Best Practices

### 1. Test Realistic Scenarios

- Use realistic user behavior patterns
- Include think time between requests
- Vary request parameters

### 2. Start Small

- Run smoke tests first
- Gradually increase load
- Monitor system metrics

### 3. Establish Baselines

- Record baseline performance
- Track trends over time
- Alert on regressions

### 4. Test Regularly

- Nightly automated tests
- Before releases
- After infrastructure changes

### 5. Monitor Everything

- Application metrics
- Database performance
- Infrastructure resources
- Business metrics

### 6. Document Findings

- Record test results
- Document bottlenecks
- Track improvements

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Load Testing Best Practices](https://k6.io/docs/testing-guides/load-testing/)
- [Performance Testing Guide](../../../docs/load-testing-guide.md)

## Support

For issues or questions:

1. Check k6 documentation
2. Review test results
3. Check application logs
4. Create GitHub issue with `performance` label

---

**Last Updated**: 2026-06-29  
**Maintainer**: Brain-Storm Performance Team  
**Next Review**: 2026-09-29
