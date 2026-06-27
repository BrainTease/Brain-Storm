#!/usr/bin/env bash
# Comprehensive post-deployment health check.
# Usage: ./scripts/deployment-health-check.sh <base-url> [max-attempts] [interval-seconds]
set -euo pipefail

BASE_URL="${1:-https://api.brain-storm.example.com}"
MAX_ATTEMPTS="${2:-30}"
INTERVAL="${3:-10}"

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
pass() { echo "[$(date '+%H:%M:%S')] ✅ $*"; }
fail() { echo "[$(date '+%H:%M:%S')] ❌ $*" >&2; }

PASSED=0
FAILED=0

check() {
  local name="$1" url="$2" expected_status="${3:-200}"
  local http_status
  http_status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$http_status" = "$expected_status" ]; then
    pass "$name → HTTP $http_status"
    PASSED=$((PASSED + 1))
  else
    fail "$name → expected HTTP $expected_status, got $http_status ($url)"
    FAILED=$((FAILED + 1))
  fi
}

wait_for_health() {
  log "Waiting for $BASE_URL/health to become reachable..."
  local attempts=0
  until curl -sf "$BASE_URL/health" > /dev/null 2>&1; do
    attempts=$((attempts + 1))
    [ "$attempts" -ge "$MAX_ATTEMPTS" ] && { fail "Health endpoint unreachable after $MAX_ATTEMPTS attempts"; exit 1; }
    log "Attempt $attempts/$MAX_ATTEMPTS — retrying in ${INTERVAL}s..."
    sleep "$INTERVAL"
  done
  pass "Health endpoint is reachable"
}

wait_for_health

log "Running endpoint smoke tests..."
check "Health"         "$BASE_URL/health"
check "API root"       "$BASE_URL/v1/health"
check "Courses list"   "$BASE_URL/v1/courses"
check "Metrics"        "$BASE_URL/metrics"

log "Checking response time..."
RESPONSE_TIME=$(curl -sf -o /dev/null -w "%{time_total}" "$BASE_URL/health" 2>/dev/null || echo "99")
if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
  pass "Response time: ${RESPONSE_TIME}s (< 2s)"
  PASSED=$((PASSED + 1))
else
  fail "Response time: ${RESPONSE_TIME}s (> 2s threshold)"
  FAILED=$((FAILED + 1))
fi

log "---"
log "Health check summary: $PASSED passed, $FAILED failed"

[ "$FAILED" -gt 0 ] && exit 1 || exit 0
