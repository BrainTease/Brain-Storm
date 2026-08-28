# Performance Baselines

This directory contains performance baseline files for load tests. Baselines represent expected performance metrics and are used to detect regressions.

## Baseline Files

- `search-discovery-baseline.json` - Search and discovery endpoints baseline
- `course-browsing-baseline.json` - Course browsing functionality baseline
- `user-workflows-baseline.json` - User workflow scenarios baseline
- `auth-flows-baseline.json` - Authentication flows baseline

## Baseline Structure

```json
{
  "timestamp": "2026-06-29T00:00:00.000Z",
  "environment": "staging",
  "metrics": {
    "p95_response_time": 250.5,
    "p99_response_time": 450.3,
    "avg_response_time": 180.2,
    "error_rate": 0.5,
    "throughput": 125.3,
    "total_requests": 15000,
    "total_errors": 75
  }
}
```

## Updating Baselines

Baselines should be updated when:

1. Intentional performance improvements are made
2. Infrastructure is upgraded
3. Significant feature changes affect performance
4. After validating new performance is acceptable

### How to Update

```bash
# Run load test and save results
k6 run --out json=results.json packages/api/load/scenarios/search-discovery.js

# Parse results
node scripts/parse-k6-results.js results.json > packages/api/load/baselines/search-discovery-baseline.json

# Verify the baseline
cat packages/api/load/baselines/search-discovery-baseline.json

# Commit the new baseline
git add packages/api/load/baselines/search-discovery-baseline.json
git commit -m "chore: update search-discovery performance baseline"
```

## Regression Detection

Our CI system automatically compares test results against baselines:

- **Regression** (❌): > 10% slower than baseline → Fail build
- **Warning** (⚠️): 5-10% slower → Warning, but pass
- **Acceptable** (✅): < 5% difference → Pass
- **Improvement** (🎉): Faster than baseline → Pass and celebrate!

## Baseline History

Track significant baseline updates here:

### 2026-06-29 - Initial Baselines

- **Author**: Brain-Storm Performance Team
- **Reason**: Initial baseline establishment
- **Environment**: Staging
- **Notes**: Based on average of 10 test runs

---

### Template for Future Updates

```markdown
### YYYY-MM-DD - [Update Description]

- **Author**: [Name/Team]
- **Reason**: [Why baseline was updated]
- **Environment**: [staging/production]
- **Changes**:
  - P95 response time: [old] → [new]
  - Throughput: [old] → [new]
- **Notes**: [Additional context]
```

## Best Practices

1. **Stability**: Run multiple tests before setting baseline (at least 5-10 runs)
2. **Consistency**: Test same time of day, similar load conditions
3. **Documentation**: Document why baseline changed
4. **Review**: Have baselines reviewed by team before committing
5. **Regular Updates**: Review baselines quarterly
6. **Environment Specific**: Keep separate baselines for staging vs production

## Monitoring Baselines

Check baseline health regularly:

- Are test results consistently meeting baselines?
- Are baselines realistic for current infrastructure?
- Do baselines align with SLOs?
- Are there consistent warnings that indicate drift?

## Resources

- [Load Testing Guide](../../../../docs/load-testing-guide.md)
- [Performance SLOs](../README.md#slo-thresholds)
- [CI/CD Integration](../../../../.github/workflows/load-testing.yml)

---

**Last Updated**: 2026-06-29  
**Maintainer**: Brain-Storm Performance Team
