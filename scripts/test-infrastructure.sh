#!/bin/bash

# Infrastructure Testing Script
# Tests deployed infrastructure for correctness and health

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/../../infra-test-results"

mkdir -p "$RESULTS_DIR"

echo "🧪 Starting Infrastructure Testing"
echo "=================================="
echo ""

# Configuration
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"
API_URL="${API_URL:-http://localhost:3000}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run test
run_test() {
  local test_name=$1
  local test_command=$2
  
  echo -n "Testing: $test_name... "
  
  if eval "$test_command" > "$RESULTS_DIR/${test_name// /_}.log" 2>&1; then
    echo "✅ PASS"
    ((TESTS_PASSED++))
    echo "$test_name: PASS" >> "$RESULTS_DIR/test-results.txt"
  else
    echo "❌ FAIL"
    ((TESTS_FAILED++))
    echo "$test_name: FAIL" >> "$RESULTS_DIR/test-results.txt"
    cat "$RESULTS_DIR/${test_name// /_}.log" >> "$RESULTS_DIR/test-results.txt"
  fi
}

# 1. API Health Checks
echo "1️⃣  API Health Checks"
echo "-------------------"
run_test "API Health Endpoint" "curl -sf $API_URL/health"
run_test "API Readiness" "curl -sf $API_URL/ready"
run_test "API Liveness" "curl -sf $API_URL/live"
echo ""

# 2. Database Connectivity
echo "2️⃣  Database Connectivity"
echo "------------------------"
run_test "PostgreSQL Connection" "psql -h $DB_HOST -p $DB_PORT -U brain-storm -d brain-storm -c 'SELECT 1' 2>/dev/null"
run_test "Database Migrations" "psql -h $DB_HOST -p $DB_PORT -U brain-storm -d brain-storm -c 'SELECT COUNT(*) FROM schema_migrations' 2>/dev/null"
echo ""

# 3. Cache Connectivity
echo "3️⃣  Cache Connectivity"
echo "---------------------"
run_test "Redis Connection" "redis-cli -h $REDIS_HOST -p $REDIS_PORT ping | grep -q PONG"
run_test "Redis Memory" "redis-cli -h $REDIS_HOST -p $REDIS_PORT info memory | grep -q used_memory"
echo ""

# 4. API Endpoints
echo "4️⃣  API Endpoints"
echo "----------------"
run_test "GET /v1/courses" "curl -sf $API_URL/v1/courses | jq . > /dev/null"
run_test "GET /v1/health" "curl -sf $API_URL/v1/health | jq . > /dev/null"
run_test "Swagger Documentation" "curl -sf $API_URL/api/docs | grep -q swagger"
echo ""

# 5. Security Headers
echo "5️⃣  Security Headers"
echo "-------------------"
run_test "X-Content-Type-Options Header" "curl -sI $API_URL/v1/courses | grep -q 'X-Content-Type-Options'"
run_test "X-Frame-Options Header" "curl -sI $API_URL/v1/courses | grep -q 'X-Frame-Options'"
run_test "Content-Security-Policy Header" "curl -sI $API_URL/v1/courses | grep -q 'Content-Security-Policy'"
echo ""

# 6. Performance Checks
echo "6️⃣  Performance Checks"
echo "---------------------"
run_test "API Response Time < 1s" "curl -w '%{time_total}' -o /dev/null -s $API_URL/v1/courses | awk '{if (\$1 < 1) exit 0; else exit 1}'"
run_test "Database Query Performance" "psql -h $DB_HOST -p $DB_PORT -U brain-storm -d brain-storm -c 'EXPLAIN ANALYZE SELECT COUNT(*) FROM users' 2>/dev/null | grep -q 'Seq Scan'"
echo ""

# 7. Infrastructure Resources
echo "7️⃣  Infrastructure Resources"
echo "----------------------------"
if command -v aws &> /dev/null; then
  run_test "AWS RDS Instance Status" "aws rds describe-db-clusters --region $AWS_REGION --query 'DBClusters[0].Status' | grep -q available"
  run_test "AWS ElastiCache Status" "aws elasticache describe-replication-groups --region $AWS_REGION --query 'ReplicationGroups[0].Status' | grep -q available"
  run_test "AWS ECS Services Running" "aws ecs describe-services --cluster brain-storm --services backend frontend --region $AWS_REGION --query 'services[0].runningCount' | grep -q '[1-9]'"
else
  echo "⚠️  AWS CLI not available, skipping AWS checks"
fi
echo ""

# 8. Backup Verification
echo "8️⃣  Backup Verification"
echo "----------------------"
if command -v aws &> /dev/null; then
  run_test "RDS Automated Backups Enabled" "aws rds describe-db-clusters --region $AWS_REGION --query 'DBClusters[0].BackupRetentionPeriod' | grep -q '[7-9]\\|[1-9][0-9]'"
  run_test "Latest RDS Backup Recent" "aws rds describe-db-cluster-snapshots --region $AWS_REGION --query 'DBClusterSnapshots[0].SnapshotCreateTime' | grep -q '$(date -d \"1 day ago\" +%Y-%m-%d)\\|$(date +%Y-%m-%d)'"
else
  echo "⚠️  AWS CLI not available, skipping backup checks"
fi
echo ""

# 9. Logging and Monitoring
echo "9️⃣  Logging and Monitoring"
echo "-------------------------"
if command -v aws &> /dev/null; then
  run_test "CloudWatch Logs Enabled" "aws logs describe-log-groups --region $AWS_REGION --query 'logGroups[0].logGroupName' | grep -q brain-storm"
  run_test "CloudWatch Alarms Configured" "aws cloudwatch describe-alarms --region $AWS_REGION --query 'MetricAlarms[0].AlarmName' | grep -q brain-storm"
else
  echo "⚠️  AWS CLI not available, skipping monitoring checks"
fi
echo ""

# 10. SSL/TLS Configuration
echo "🔟 SSL/TLS Configuration"
echo "----------------------"
if [[ "$API_URL" == https://* ]]; then
  run_test "SSL Certificate Valid" "echo | openssl s_client -servername $(echo $API_URL | cut -d/ -f3) -connect $(echo $API_URL | cut -d/ -f3):443 2>/dev/null | grep -q 'Verify return code: 0'"
  run_test "TLS 1.2 or Higher" "echo | openssl s_client -servername $(echo $API_URL | cut -d/ -f3) -connect $(echo $API_URL | cut -d/ -f3):443 2>/dev/null | grep -q 'TLSv1.[2-9]'"
else
  echo "⚠️  API URL is not HTTPS, skipping SSL checks"
fi
echo ""

# Generate Summary Report
echo "📊 Test Summary"
echo "==============="
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo "Total:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

# Generate detailed report
cat > "$RESULTS_DIR/test-summary.md" << EOF
# Infrastructure Test Report

**Date**: $(date)
**Environment**: $ENVIRONMENT
**API URL**: $API_URL

## Summary

| Metric | Value |
|--------|-------|
| Tests Passed | $TESTS_PASSED |
| Tests Failed | $TESTS_FAILED |
| Total Tests | $((TESTS_PASSED + TESTS_FAILED)) |
| Success Rate | $(echo "scale=2; $TESTS_PASSED * 100 / ($TESTS_PASSED + $TESTS_FAILED)" | bc)% |

## Test Results

EOF

cat "$RESULTS_DIR/test-results.txt" >> "$RESULTS_DIR/test-summary.md" 2>/dev/null || true

echo "✅ Test report generated: $RESULTS_DIR/test-summary.md"
echo ""

# Exit with appropriate code
if [ $TESTS_FAILED -gt 0 ]; then
  echo "❌ Infrastructure tests failed"
  exit 1
else
  echo "✅ All infrastructure tests passed"
  exit 0
fi
