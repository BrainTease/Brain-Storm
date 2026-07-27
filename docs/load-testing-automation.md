# Automated Load Testing Guide

This document describes the automated load testing infrastructure for Brain-Storm, including baseline comparison, performance alerts, and CI/CD integration.

## Overview

The automated load testing system provides:
- **Continuous Performance Monitoring**: Scheduled load tests run automatically
- **Baseline Comparison**: Automatic regression detection against performance baselines
- **Performance Alerts**: Real-time notifications for performance degradation
- **Historical Tracking**: Load test results stored and compared over time
- **CI/CD Integration**: Load tests run on every deployment to staging/production

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  GitHub Actions Workflow                 │
│                  (Scheduled or Manual)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   k6 Load Test Execution   │
        │  (Multiple Scenarios)      │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  JSON Results Generation   │
        │  (Per Scenario)            │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  Baseline Comparison & Analysis    │
        │  - Regression Detection            │
        │  - Performance Alerts              │
        │  - Report Generation               │
        └────────────┬───────────────────────┘
                     │
        ┌────────────┴────────────┬──────────────┐
        ▼                         ▼              ▼
    ┌────────┐            ┌──────────────┐  ┌────────┐
    │ Slack  │            │ GitHub Issue │  │ Email  │
    │ Alert  │            │ Creation     │  │ Alert  │
    └────────┘            └──────────────┘  └────────┘
```

## Load Test Scenarios

### 1. User Journey Test
**File**: `scripts/load-tests/user-journey.js`

Simulates a complete user journey:
- Register/Login
- Browse courses
- Enroll in course
- Complete module
- Claim certificate

**Configuration**:
- VUs: 50-100
- Duration: 5 minutes
- Ramp-up: 30 seconds

**Baseline Thresholds**:
- p95 Latency: < 500ms
- p99 Latency: < 1000ms
- Error Rate: < 5%

### 2. High Concurrency Test
**File**: `scripts/load-tests/high-concurrency.js`

Tests system under high concurrent load:
- 500+ simultaneous users
- Sustained load for 2 minutes
- Focus on API endpoints

**Configuration**:
- VUs: 500
- Duration: 2 minutes
- Ramp-up: 1 minute

**Baseline Thresholds**:
- p95 Latency: < 1000ms
- p99 Latency: < 2000ms
- Error Rate: < 5%

### 3. Stress Test
**File**: `scripts/load-tests/stress-test.js`

Gradually increases load until system breaks:
- Starts at 100 VUs
- Increases by 50 VUs every 30 seconds
- Continues until error rate exceeds threshold

**Configuration**:
- Initial VUs: 100
- Increment: 50 VUs per 30s
- Max Duration: 10 minutes

**Baseline Thresholds**:
- p95 Latency: < 2000ms
- p99 Latency: < 5000ms
- Error Rate: < 20%

### 4. Spike Test
**File**: `scripts/load-tests/spike-test.js`

Sudden traffic spike simulation:
- Normal load: 50 VUs
- Spike to 500 VUs instantly
- Measure recovery time

**Configuration**:
- Normal VUs: 50
- Spike VUs: 500
- Spike Duration: 1 minute

**Baseline Thresholds**:
- p95 Latency: < 3000ms
- Error Rate: < 15%

### 5. Soak Test
**File**: `scripts/load-tests/soak-test.js`

Long-duration test to detect memory leaks:
- Moderate load: 100 VUs
- Duration: 30 minutes
- Monitor for degradation

**Configuration**:
- VUs: 100
- Duration: 30 minutes
- Ramp-up: 2 minutes

**Baseline Thresholds**:
- p95 Latency: < 600ms
- p99 Latency: < 1200ms
- Error Rate: < 1%

## Running Load Tests

### Local Execution

```bash
# Run all tests
./scripts/load-test.sh

# Run specific scenario
k6 run --vus 100 --duration 5m scripts/load-tests/user-journey.js

# With custom API URL
API_URL=https://staging.example.com ./scripts/load-test.sh

# With environment variables
k6 run \
  --env API_URL=http://localhost:3000 \
  --env DURATION=5m \
  scripts/load-tests/user-journey.js
```

### Automated Execution

Load tests run automatically via GitHub Actions:

**Schedule**: Daily at 3 AM UTC
**Trigger**: Manual via workflow dispatch
**Scenarios**: All (or select specific)

### Manual Trigger

```bash
gh workflow run load-testing.yml \
  -f scenario=user-journey \
  -f api_url=https://staging.example.com
```

## Baseline Comparison

### How It Works

1. **Test Execution**: k6 runs and generates JSON results
2. **Metric Extraction**: Script parses k6 JSON output
3. **Baseline Comparison**: Current metrics compared against baselines
4. **Regression Detection**: Identifies metrics exceeding thresholds
5. **Alert Generation**: Creates notifications and issues

### Thresholds

**Regression Threshold**: 10%
- Metric exceeds baseline by 10% or more
- Severity: HIGH
- Action: Create GitHub issue

**Warning Threshold**: 5%
- Metric exceeds baseline by 5-10%
- Severity: MEDIUM
- Action: Slack notification

**Improvement**: < -5%
- Metric improves by 5% or more
- Severity: INFO
- Action: Log and report

### Running Comparison

```bash
# Automatic (in CI/CD)
node scripts/load-test-baseline-comparison.js

# Manual
RESULTS_DIR=./load-test-results \
BASELINES_FILE=./scripts/load-tests/baselines/performance-baselines.json \
node scripts/load-test-baseline-comparison.js
```

### Output

```
📊 Load Test Baseline Comparison Report
==================================================
Timestamp: 2026-06-01T10:30:00.000Z

🚨 REGRESSIONS DETECTED:
  • http_req_duration: 15.50% (500 → 576.25) [high]
  • http_req_failed: 12.00% (0.01 → 0.0112) [high]

⚠️  WARNINGS:
  • http_reqs: 7.50% (200 → 185) [warning]

✅ IMPROVEMENTS:
  • http_req_duration: -8.00% (500 → 460)

📄 Detailed report saved to: load-test-results/baseline-comparison-report.json
```

## Performance Alerts

### Alert Configuration

Alerts are defined in `scripts/load-tests/performance-alerts.js`:

```javascript
{
  name: 'High Latency P95',
  metric: 'http_req_duration',
  percentile: 'p95',
  threshold: 500,
  unit: 'ms',
  severity: 'warning',
  action: 'notify',
}
```

### Alert Channels

#### Slack
- **Enabled**: When `SLACK_WEBHOOK_URL` is set
- **Format**: Rich message with metrics and links
- **Escalation**: Critical alerts escalate after 5 minutes

#### GitHub Issues
- **Enabled**: Always (for critical alerts)
- **Labels**: `performance`, `load-testing`
- **Content**: Metrics, baseline comparison, run link

#### Email
- **Enabled**: When `ALERT_EMAIL` is set
- **Recipients**: Comma-separated list
- **Format**: HTML email with charts

### Escalation Policy

```
Warning (5% threshold)
    ↓ (5 minutes)
    ↓
Critical (10% threshold)
    ↓ (immediate)
    ↓
Escalate to on-call engineer
```

## Updating Baselines

Baselines should be updated when intentional performance improvements are made.

### Process

1. **Review Changes**: Ensure performance improvement is intentional
2. **Update Baseline**: Modify `scripts/load-tests/baselines/performance-baselines.json`
3. **Document**: Add comment explaining the change
4. **Commit**: Include in PR with performance improvement

### Example

```json
{
  "scenarios": {
    "user_journey": {
      "p95_ms": 450,  // Reduced from 500ms
      "p99_ms": 900,  // Reduced from 1000ms
      "error_rate_max": 0.05
    }
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/load-testing.yml`

**Triggers**:
- Schedule: Daily at 3 AM UTC
- Manual: Workflow dispatch
- On deployment: Staging/production deployments

**Steps**:
1. Checkout code
2. Setup Node.js and k6
3. Start backend services (PostgreSQL, Redis)
4. Run migrations
5. Execute load tests
6. Compare against baselines
7. Generate alerts
8. Upload artifacts
9. Create issues on regression

### Deployment Integration

Load tests run before production deployments:

```yaml
- name: Run load tests
  run: ./scripts/load-test.sh
  env:
    API_URL: ${{ secrets.STAGING_API_URL }}
```

If tests fail, deployment is blocked.

## Monitoring & Observability

### Metrics Tracked

- **Latency**: p50, p95, p99, min, max
- **Throughput**: Requests per second (RPS)
- **Error Rate**: Failed requests percentage
- **Data Transfer**: Bytes sent/received
- **Connection Metrics**: TLS handshake, DNS lookup

### Dashboards

Grafana dashboards available at:
- `http://localhost:3000/d/load-testing` (local)
- `https://monitoring.example.com/d/load-testing` (production)

### Logs

Load test logs stored in:
- `load-test-results/` (local)
- CloudWatch Logs (AWS)
- ELK Stack (production)

## Troubleshooting

### High Error Rate

**Symptoms**: Error rate > 5%

**Causes**:
- Backend service down
- Database connection issues
- Rate limiting triggered
- Invalid test data

**Resolution**:
```bash
# Check backend health
curl http://localhost:3000/health

# Check database
psql -h localhost -U brain-storm -d brain-storm -c "SELECT 1"

# Check rate limiting
curl -I http://localhost:3000/v1/courses
# Look for X-RateLimit-* headers
```

### High Latency

**Symptoms**: p95 latency > 500ms

**Causes**:
- Database slow queries
- External API delays
- Network issues
- Resource constraints

**Resolution**:
```bash
# Check slow queries
SELECT query, mean_time FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

# Check resource usage
docker stats

# Check network
ping -c 10 api.example.com
```

### Memory Leaks (Soak Test)

**Symptoms**: Latency increases over time

**Causes**:
- Memory leak in application
- Connection pool exhaustion
- Cache growth

**Resolution**:
```bash
# Monitor memory during soak test
watch -n 1 'docker stats --no-stream'

# Check connection pools
SELECT count(*) FROM pg_stat_activity;

# Review application logs
docker logs -f backend
```

## Best Practices

1. **Run Regularly**: Execute load tests at least daily
2. **Monitor Trends**: Track metrics over time
3. **Update Baselines**: When intentional improvements are made
4. **Test Staging First**: Always test on staging before production
5. **Document Changes**: Record why baselines were updated
6. **Alert Responsiveness**: Respond to alerts within 1 hour
7. **Capacity Planning**: Use load test data for infrastructure planning
8. **Load Test Diversity**: Run different scenarios to catch various issues

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 HTTP API](https://k6.io/docs/javascript-api/k6-http/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [Performance Testing Guide](./performance-testing-guide.md)
- [Monitoring & Observability](./monitoring-observability.md)
