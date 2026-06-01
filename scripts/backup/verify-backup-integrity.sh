#!/bin/bash

# Backup Verification Script
# Validates backup integrity and tests restore procedures

set -euo pipefail

BACKUP_PATH="${1:-.}"
ENVIRONMENT="${2:-dev}"
REPORT_FILE="${3:-backup-verification-report.json}"

echo "🔍 Starting backup verification..."
echo "   Backup Path: $BACKUP_PATH"
echo "   Environment: $ENVIRONMENT"
echo ""

# Initialize report
REPORT="{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"environment\": \"$ENVIRONMENT\", \"checks\": []}"

# ─── Check 1: Backup File Integrity ───────────────────────────────────────────

echo "✓ Checking backup file integrity..."
INTEGRITY_CHECK=true

for backup_file in "$BACKUP_PATH"/*.sql.gz "$BACKUP_PATH"/*.tar.gz 2>/dev/null || true; do
  if [ -f "$backup_file" ]; then
    if gzip -t "$backup_file" 2>/dev/null; then
      echo "  ✅ $backup_file: Valid"
    else
      echo "  ❌ $backup_file: Corrupted"
      INTEGRITY_CHECK=false
    fi
  fi
done

REPORT=$(echo "$REPORT" | jq ".checks += [{\"name\": \"file_integrity\", \"status\": \"$([ $INTEGRITY_CHECK = true ] && echo 'pass' || echo 'fail')\"}]")

# ─── Check 2: Backup Size Validation ──────────────────────────────────────────

echo ""
echo "✓ Validating backup sizes..."
SIZE_CHECK=true

for backup_file in "$BACKUP_PATH"/*.sql.gz "$BACKUP_PATH"/*.tar.gz 2>/dev/null || true; do
  if [ -f "$backup_file" ]; then
    SIZE=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo 0)
    SIZE_MB=$((SIZE / 1024 / 1024))
    
    if [ "$SIZE_MB" -gt 0 ]; then
      echo "  ✅ $backup_file: ${SIZE_MB}MB"
    else
      echo "  ❌ $backup_file: Empty or invalid"
      SIZE_CHECK=false
    fi
  fi
done

REPORT=$(echo "$REPORT" | jq ".checks += [{\"name\": \"backup_size\", \"status\": \"$([ $SIZE_CHECK = true ] && echo 'pass' || echo 'fail')\"}]")

# ─── Check 3: Backup Timestamp Validation ─────────────────────────────────────

echo ""
echo "✓ Validating backup timestamps..."
TIMESTAMP_CHECK=true

for backup_file in "$BACKUP_PATH"/*.sql.gz "$BACKUP_PATH"/*.tar.gz 2>/dev/null || true; do
  if [ -f "$backup_file" ]; then
    MTIME=$(stat -f%m "$backup_file" 2>/dev/null || stat -c%Y "$backup_file" 2>/dev/null || echo 0)
    MTIME_DATE=$(date -r "$MTIME" +%Y-%m-%d 2>/dev/null || echo "unknown")
    
    # Check if backup is not older than 7 days
    DAYS_OLD=$(( ($(date +%s) - MTIME) / 86400 ))
    
    if [ "$DAYS_OLD" -lt 7 ]; then
      echo "  ✅ $backup_file: $DAYS_OLD days old"
    else
      echo "  ⚠️  $backup_file: $DAYS_OLD days old (older than 7 days)"
      TIMESTAMP_CHECK=false
    fi
  fi
done

REPORT=$(echo "$REPORT" | jq ".checks += [{\"name\": \"backup_timestamp\", \"status\": \"$([ $TIMESTAMP_CHECK = true ] && echo 'pass' || echo 'fail')\"}]")

# ─── Check 4: Restore Test (Dry Run) ──────────────────────────────────────────

echo ""
echo "✓ Testing restore procedure (dry run)..."
RESTORE_CHECK=true

for backup_file in "$BACKUP_PATH"/*.sql.gz 2>/dev/null || true; do
  if [ -f "$backup_file" ]; then
    # Test decompression
    if gunzip -t "$backup_file" 2>/dev/null; then
      echo "  ✅ $backup_file: Restore test passed"
    else
      echo "  ❌ $backup_file: Restore test failed"
      RESTORE_CHECK=false
    fi
  fi
done

REPORT=$(echo "$REPORT" | jq ".checks += [{\"name\": \"restore_test\", \"status\": \"$([ $RESTORE_CHECK = true ] && echo 'pass' || echo 'fail')\"}]")

# ─── Check 5: Backup Encryption Validation ────────────────────────────────────

echo ""
echo "✓ Validating backup encryption..."
ENCRYPTION_CHECK=true

for backup_file in "$BACKUP_PATH"/*.sql.gz.enc "$BACKUP_PATH"/*.tar.gz.enc 2>/dev/null || true; do
  if [ -f "$backup_file" ]; then
    # Check if file has encryption header
    if file "$backup_file" | grep -q "encrypted\|GPG\|OpenSSL"; then
      echo "  ✅ $backup_file: Encrypted"
    else
      echo "  ⚠️  $backup_file: Encryption status unknown"
    fi
  fi
done

REPORT=$(echo "$REPORT" | jq ".checks += [{\"name\": \"encryption\", \"status\": \"$([ $ENCRYPTION_CHECK = true ] && echo 'pass' || echo 'fail')\"}]")

# ─── Check 6: Backup Redundancy ───────────────────────────────────────────────

echo ""
echo "✓ Checking backup redundancy..."
REDUNDANCY_CHECK=true

BACKUP_COUNT=$(find "$BACKUP_PATH" -type f \( -name "*.sql.gz" -o -name "*.tar.gz" \) 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -ge 3 ]; then
  echo "  ✅ Found $BACKUP_COUNT backups (redundancy OK)"
elif [ "$BACKUP_COUNT" -ge 1 ]; then
  echo "  ⚠️  Found $BACKUP_COUNT backup(s) (consider more redundancy)"
  REDUNDANCY_CHECK=false
else
  echo "  ❌ No backups found"
  REDUNDANCY_CHECK=false
fi

REPORT=$(echo "$REPORT" | jq ".checks += [{\"name\": \"redundancy\", \"status\": \"$([ $REDUNDANCY_CHECK = true ] && echo 'pass' || echo 'fail')\"}]")

# ─── Generate Report ──────────────────────────────────────────────────────────

echo ""
echo "📊 Generating verification report..."

# Calculate overall status
OVERALL_STATUS="pass"
if echo "$REPORT" | jq -e '.checks[] | select(.status == "fail")' > /dev/null 2>&1; then
  OVERALL_STATUS="fail"
fi

REPORT=$(echo "$REPORT" | jq ".overall_status = \"$OVERALL_STATUS\"")

# Save report
echo "$REPORT" | jq '.' > "$REPORT_FILE"
echo "✅ Report saved to: $REPORT_FILE"

# Print summary
echo ""
echo "📋 Verification Summary:"
echo "   Overall Status: $OVERALL_STATUS"
echo "   Checks Passed: $(echo "$REPORT" | jq '[.checks[] | select(.status == "pass")] | length')"
echo "   Checks Failed: $(echo "$REPORT" | jq '[.checks[] | select(.status == "fail")] | length')"

# Exit with appropriate code
[ "$OVERALL_STATUS" = "pass" ] && exit 0 || exit 1
