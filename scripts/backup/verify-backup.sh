#!/usr/bin/env bash
# Restore the most-recent database backup to a temporary RDS instance and
# run sanity checks. Exits non-zero if verification fails.
set -euo pipefail

: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"
: "${VERIFY_DB_HOST:?VERIFY_DB_HOST is required (isolated verify instance)}"
: "${VERIFY_DB_USER:?VERIFY_DB_USER is required}"
: "${VERIFY_DB_PASSWORD:?VERIFY_DB_PASSWORD is required}"
: "${VERIFY_DB_NAME:?VERIFY_DB_NAME is required}"

ENVIRONMENT="${ENVIRONMENT:-unknown}"
MANIFEST_KEY="database/${ENVIRONMENT}/manifest.json"
RESULT_LOG_GROUP="/brain-storm/${ENVIRONMENT}/backup-verification"

log() { echo "[$(date -u)] $*"; }

log "Fetching backup manifest from s3://${BACKUP_S3_BUCKET}/${MANIFEST_KEY}"
MANIFEST=$(aws s3 cp "s3://${BACKUP_S3_BUCKET}/${MANIFEST_KEY}" -)
LATEST_KEY=$(echo "$MANIFEST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[-1]['s3Key'])")
log "Latest backup: ${LATEST_KEY}"

ENCRYPTED_FILE="/tmp/verify-backup.sql.gz.enc"
DECRYPTED_FILE="/tmp/verify-backup.sql.gz"
cleanup() { rm -f "$ENCRYPTED_FILE" "$DECRYPTED_FILE"; }
trap cleanup EXIT

log "Downloading backup..."
aws s3 cp "s3://${BACKUP_S3_BUCKET}/${LATEST_KEY}" "$ENCRYPTED_FILE"

log "Decrypting backup..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "$ENCRYPTED_FILE" \
  -out "$DECRYPTED_FILE" \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}"

log "Restoring to verify instance..."
PGPASSWORD="$VERIFY_DB_PASSWORD" psql \
  --host="$VERIFY_DB_HOST" \
  --username="$VERIFY_DB_USER" \
  --dbname="$VERIFY_DB_NAME" \
  --no-password \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null

zcat "$DECRYPTED_FILE" | PGPASSWORD="$VERIFY_DB_PASSWORD" psql \
  --host="$VERIFY_DB_HOST" \
  --username="$VERIFY_DB_USER" \
  --dbname="$VERIFY_DB_NAME" \
  --no-password >/dev/null

log "Running sanity checks..."
CHECKS_PASSED=true

run_check() {
  local label="$1"
  local query="$2"
  local min_rows="${3:-1}"
  local count
  count=$(PGPASSWORD="$VERIFY_DB_PASSWORD" psql \
    --host="$VERIFY_DB_HOST" \
    --username="$VERIFY_DB_USER" \
    --dbname="$VERIFY_DB_NAME" \
    --no-password -t -c "$query" | tr -d ' ')
  if [[ "$count" -ge "$min_rows" ]]; then
    log "  PASS [$label]: ${count} rows"
  else
    log "  FAIL [$label]: expected >= ${min_rows}, got ${count}"
    CHECKS_PASSED=false
  fi
}

run_check "users"         "SELECT COUNT(*) FROM users"         1
run_check "courses"       "SELECT COUNT(*) FROM courses"       0
run_check "audit_logs"    "SELECT COUNT(*) FROM audit_logs"    0
run_check "secret_rots"   "SELECT COUNT(*) FROM secret_rotations" 0

TABLE_COUNT=$(PGPASSWORD="$VERIFY_DB_PASSWORD" psql \
  --host="$VERIFY_DB_HOST" \
  --username="$VERIFY_DB_USER" \
  --dbname="$VERIFY_DB_NAME" \
  --no-password -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" | tr -d ' ')
log "  Schema tables restored: ${TABLE_COUNT}"
if [[ "$TABLE_COUNT" -lt 10 ]]; then
  log "  FAIL [schema]: expected >= 10 tables, got ${TABLE_COUNT}"
  CHECKS_PASSED=false
fi

RESULT="SUCCESS"
$CHECKS_PASSED || RESULT="FAILURE"

aws logs create-log-group --log-group-name "$RESULT_LOG_GROUP" 2>/dev/null || true
aws logs create-log-stream \
  --log-group-name "$RESULT_LOG_GROUP" \
  --log-stream-name "$(date -u +%Y/%m/%d)/verify" 2>/dev/null || true

aws logs put-log-events \
  --log-group-name "$RESULT_LOG_GROUP" \
  --log-stream-name "$(date -u +%Y/%m/%d)/verify" \
  --log-events "timestamp=$(date +%s%3N),message={\"result\":\"${RESULT}\",\"backup\":\"${LATEST_KEY}\"}"

if [[ "$RESULT" == "FAILURE" ]]; then
  log "Backup verification FAILED" >&2
  exit 1
fi
log "Backup verification PASSED"
