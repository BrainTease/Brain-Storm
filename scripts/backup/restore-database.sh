#!/usr/bin/env bash
# Restore a database backup from S3 to the target PostgreSQL instance.
# Usage: restore-database.sh [--snapshot <s3-key>] [--env <env>] [--target-host <host>]
set -euo pipefail

: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"

TARGET_HOST="${DATABASE_HOST:-}"
TARGET_USER="${DATABASE_USER:-}"
TARGET_PASSWORD="${DATABASE_PASSWORD:-}"
TARGET_DB="${DATABASE_NAME:-}"
ENVIRONMENT="${ENVIRONMENT:-unknown}"
SNAPSHOT_KEY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --snapshot)    SNAPSHOT_KEY="$2";    shift 2 ;;
    --env)         ENVIRONMENT="$2";     shift 2 ;;
    --target-host) TARGET_HOST="$2";     shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

: "${TARGET_HOST:?--target-host or DATABASE_HOST is required}"
: "${TARGET_USER:?DATABASE_USER is required}"
: "${TARGET_PASSWORD:?DATABASE_PASSWORD is required}"
: "${TARGET_DB:?DATABASE_NAME is required}"

log() { echo "[$(date -u)] $*"; }

if [[ -z "$SNAPSHOT_KEY" ]]; then
  log "No --snapshot provided; resolving latest from manifest..."
  MANIFEST_KEY="database/${ENVIRONMENT}/manifest.json"
  MANIFEST=$(aws s3 cp "s3://${BACKUP_S3_BUCKET}/${MANIFEST_KEY}" -)
  SNAPSHOT_KEY=$(echo "$MANIFEST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[-1]['s3Key'])")
  log "Using latest backup: ${SNAPSHOT_KEY}"
fi

ENCRYPTED_FILE="/tmp/restore-backup.sql.gz.enc"
DECRYPTED_FILE="/tmp/restore-backup.sql.gz"
cleanup() { rm -f "$ENCRYPTED_FILE" "$DECRYPTED_FILE"; }
trap cleanup EXIT

log "Downloading s3://${BACKUP_S3_BUCKET}/${SNAPSHOT_KEY}..."
aws s3 cp "s3://${BACKUP_S3_BUCKET}/${SNAPSHOT_KEY}" "$ENCRYPTED_FILE"

log "Decrypting..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "$ENCRYPTED_FILE" \
  -out "$DECRYPTED_FILE" \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}"

echo ""
echo "WARNING: This will DROP and recreate the public schema on:"
echo "  Host:     ${TARGET_HOST}"
echo "  Database: ${TARGET_DB}"
echo "  Snapshot: ${SNAPSHOT_KEY}"
echo ""
read -r -p "Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

log "Dropping existing schema..."
PGPASSWORD="$TARGET_PASSWORD" psql \
  --host="$TARGET_HOST" \
  --username="$TARGET_USER" \
  --dbname="$TARGET_DB" \
  --no-password \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null

log "Restoring..."
zcat "$DECRYPTED_FILE" | PGPASSWORD="$TARGET_PASSWORD" psql \
  --host="$TARGET_HOST" \
  --username="$TARGET_USER" \
  --dbname="$TARGET_DB" \
  --no-password

ROW_COUNT=$(PGPASSWORD="$TARGET_PASSWORD" psql \
  --host="$TARGET_HOST" \
  --username="$TARGET_USER" \
  --dbname="$TARGET_DB" \
  --no-password -t -c "SELECT COUNT(*) FROM users" | tr -d ' ')
log "Restore complete. Users table row count: ${ROW_COUNT}"
log "Run the application health check to confirm full service availability."
