#!/bin/bash

# Compliance Checking Script
# Scans codebase and infrastructure for compliance violations

set -euo pipefail

ENVIRONMENT="${1:-dev}"
REPORT_FILE="${2:-compliance-report.json}"

echo "🔍 Starting compliance scan for: $ENVIRONMENT"
echo "   Report: $REPORT_FILE"
echo ""

# Initialize report
REPORT="{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"environment\": \"$ENVIRONMENT\", \"rules\": []}"

# ─── Rule 1: Check for hardcoded secrets ──────────────────────────────────────

echo "✓ Scanning for hardcoded secrets..."
SECRETS_FOUND=0

# Check for common secret patterns
for pattern in "password\s*=\s*['\"]" "api_key\s*=\s*['\"]" "secret\s*=\s*['\"]" "token\s*=\s*['\"]"; do
  MATCHES=$(grep -r "$pattern" --include="*.ts" --include="*.js" --include="*.py" --include="*.rs" . 2>/dev/null | grep -v node_modules | grep -v ".git" | wc -l || echo 0)
  if [ "$MATCHES" -gt 0 ]; then
    echo "  ⚠️  Found $MATCHES potential hardcoded secrets"
    SECRETS_FOUND=$((SECRETS_FOUND + MATCHES))
  fi
done

SECRETS_STATUS=$([ "$SECRETS_FOUND" -eq 0 ] && echo "pass" || echo "fail")
REPORT=$(echo "$REPORT" | jq ".rules += [{\"name\": \"no_hardcoded_secrets\", \"status\": \"$SECRETS_STATUS\", \"violations\": $SECRETS_FOUND}]")

# ─── Rule 2: Check for HTTPS enforcement ──────────────────────────────────────

echo "✓ Checking HTTPS enforcement..."
HTTP_VIOLATIONS=0

# Check for unencrypted HTTP URLs in production config
if [ -f ".env.example" ]; then
  HTTP_URLS=$(grep -i "http://" .env.example | grep -v "localhost\|127.0.0.1" | wc -l || echo 0)
  if [ "$HTTP_URLS" -gt 0 ]; then
    echo "  ⚠️  Found $HTTP_URLS unencrypted HTTP URLs"
    HTTP_VIOLATIONS=$HTTP_URLS
  fi
fi

HTTPS_STATUS=$([ "$HTTP_VIOLATIONS" -eq 0 ] && echo "pass" || echo "fail")
REPORT=$(echo "$REPORT" | jq ".rules += [{\"name\": \"https_enforcement\", \"status\": \"$HTTPS_STATUS\", \"violations\": $HTTP_VIOLATIONS}]")

# ─── Rule 3: Check for dependency vulnerabilities ────────────────────────────

echo "✓ Checking for vulnerable dependencies..."
VULN_COUNT=0

if command -v npm &> /dev/null && [ -f "package.json" ]; then
  VULN_COUNT=$(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.total' || echo 0)
  echo "  Found $VULN_COUNT npm vulnerabilities"
fi

VULN_STATUS=$([ "$VULN_COUNT" -eq 0 ] && echo "pass" || echo "fail")
REPORT=$(echo "$REPORT" | jq ".rules += [{\"name\": \"no_vulnerable_dependencies\", \"status\": \"$VULN_STATUS\", \"violations\": $VULN_COUNT}]")

# ─── Rule 4: Check for proper error handling ──────────────────────────────────

echo "✓ Checking error handling..."
MISSING_ERROR_HANDLING=0

# Check for unhandled promises
UNHANDLED=$(grep -r "\.then\|\.catch" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v "\.catch(" | wc -l || echo 0)
if [ "$UNHANDLED" -gt 0 ]; then
  echo "  ⚠️  Found $UNHANDLED potential unhandled promise rejections"
  MISSING_ERROR_HANDLING=$UNHANDLED
fi

ERROR_STATUS=$([ "$MISSING_ERROR_HANDLING" -eq 0 ] && echo "pass" || echo "fail")
REPORT=$(echo "$REPORT" | jq ".rules += [{\"name\": \"proper_error_handling\", \"status\": \"$ERROR_STATUS\", \"violations\": $MISSING_ERROR_HANDLING}]")

# ─── Rule 5: Check for input validation ───────────────────────────────────────

echo "✓ Checking input validation..."
MISSING_VALIDATION=0

# Check for unvalidated user inputs in API endpoints
UNVALIDATED=$(grep -r "req\.body\|req\.query\|req\.params" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v "validate\|schema\|joi\|zod" | wc -l || echo 0)
if [ "$UNVALIDATED" -gt 0 ]; then
  echo "  ⚠️  Found $UNVALIDATED potential unvalidated inputs"
  MISSING_VALIDATION=$UNVALIDATED
fi

VALIDATION_STATUS=$([ "$MISSING_VALIDATION" -eq 0 ] && echo "pass" || echo "fail")
REPORT=$(echo "$REPORT" | jq ".rules += [{\"name\": \"input_validation\", \"status\": \"$VALIDATION_STATUS\", \"violations\": $MISSING_VALIDATION}]")

# ─── Rule 6: Check for logging compliance ─────────────────────────────────────

echo "✓ Checking logging compliance..."
MISSING_LOGGING=0

# Check for sensitive data in logs
SENSITIVE_LOGS=$(grep -r "console\.log\|logger\.info" --include="*.ts" --include="*.js" . 2>/dev/null | grep -i "password\|token\|secret\|key" | wc -l || echo 0)
if [ "$SENSITIVE_LOGS" -gt 0 ]; then
  echo "  ⚠️  Found $SENSITIVE_LOGS potential sensitive data in logs"
  MISSING_LOGGING=$SENSITIVE_LOGS
fi

LOGGING_STATUS=$([ "$MISSING_LOGGING" -eq 0 ] && echo "pass" || echo "fail")
REPORT=$(echo "$REPORT" | jq ".rules += [{\"name\": \"logging_compliance\", \"status\": \"$LOGGING_STATUS\", \"violations\": $MISSING_LOGGING}]")

# ─── Rule 7: Check for authentication enforcement ────────────────────────────

echo "✓ Checking authentication enforcement..."
MISSING_AUTH=0

# Check for unprotected endpoints
UNPROTECTED=$(grep -r "@Get\|@Post\|@Put\|@Delete" --include="*.ts" . 2>/dev/null | grep -v "@UseGuards\|@Auth\|@Public" | wc -l || echo 0)
if [ "$UNPROTECTED" -gt 0 ]; then
  echo "  ⚠️  Found $UNPROTECTED potential unprotected endpoints"
  MISSING_AUTH=$UNPROTECTED
fi

AUTH_STATUS=$([ "$MISSING_AUTH" -eq 0 ] && echo "pass" || echo "fail")
REPORT=$(echo "$REPORT" | jq ".rules += [{\"name\": \"authentication_enforcement\", \"status\": \"$AUTH_STATUS\", \"violations\": $MISSING_AUTH}]")

# ─── Rule 8: Check for CORS configuration ────────────────────────────────────

echo "✓ Checking CORS configuration..."
CORS_VIOLATIONS=0

# Check for overly permissive CORS
CORS_WILDCARD=$(grep -r "origin.*\*\|Access-Control-Allow-Origin.*\*" --include="*.ts" --include="*.js" . 2>/dev/null | wc -l || echo 0)
if [ "$CORS_WILDCARD" -gt 0 ]; then
  echo "  ⚠️  Found $CORS_WILDCARD overly permissive CORS configurations"
  CORS_VIOLATIONS=$CORS_WILDCARD
fi

CORS_STATUS=$([ "$CORS_VIOLATIONS" -eq 0 ] && echo "pass" || echo "fail")
REPORT=$(echo "$REPORT" | jq ".rules += [{\"name\": \"cors_configuration\", \"status\": \"$CORS_STATUS\", \"violations\": $CORS_VIOLATIONS}]")

# ─── Generate Report ──────────────────────────────────────────────────────────

echo ""
echo "📊 Generating compliance report..."

# Calculate overall status
OVERALL_STATUS="pass"
if echo "$REPORT" | jq -e '.rules[] | select(.status == "fail")' > /dev/null 2>&1; then
  OVERALL_STATUS="fail"
fi

REPORT=$(echo "$REPORT" | jq ".overall_status = \"$OVERALL_STATUS\"")

# Save report
echo "$REPORT" | jq '.' > "$REPORT_FILE"
echo "✅ Report saved to: $REPORT_FILE"

# Print summary
echo ""
echo "📋 Compliance Summary:"
echo "   Overall Status: $OVERALL_STATUS"
echo "   Rules Passed: $(echo "$REPORT" | jq '[.rules[] | select(.status == "pass")] | length')"
echo "   Rules Failed: $(echo "$REPORT" | jq '[.rules[] | select(.status == "fail")] | length')"
echo ""
echo "   Violations:"
echo "$REPORT" | jq -r '.rules[] | "   - \(.name): \(.violations) violations"'

# Exit with appropriate code
[ "$OVERALL_STATUS" = "pass" ] && exit 0 || exit 1
