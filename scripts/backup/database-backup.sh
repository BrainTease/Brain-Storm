#!/usr/bin/env bash
# Dump PostgreSQL to S3 with AES-256 encryption and optional retention enforcement.
set -euo pipefail

: "${DATABASE_HOST:?DATABASE_HOST is required}"
: "${DATABASE_USER:?DATABASE_USER is required}"
: "${DATABASE_PASSWORD:?DATABASE_PASSWORD is required}"
: "${DATABASE_NAME:?DATABASE_NAME is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
ENVIRONMENT="${ENVIRONMENT:-unknown}"
DUMP_FILE="/tmp/db-backup-${ENVIRONMENT}-${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${DUMP_FILE}.enc"
S3_KEY="database/${ENVIRONMENT}/${TIMESTAMP}/backup.sql.gz.enc"

cleanup() {
  rm -f "$DUMP_FILE" "$ENCRYPTED_FILE"
}
trap cleanup EXIT

echo "[$(date -u)] Starting database backup: ${DATABASE_NAME} -> s3://${BACKUP_S3_BUCKET}/${S3_KEY}"

PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
  --host="$DATABASE_HOST" \
  --username="$DATABASE_USER" \
  --dbname="$DATABASE_NAME" \
  --no-password \
  --format=plain \
  --compress=9 \
  | gzip > "$DUMP_FILE"

DUMP_SIZE=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")
echo "[$(date -u)] Dump size: ${DUMP_SIZE} bytes"

openssl enc -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "$DUMP_FILE" \
  -out "$ENCRYPTED_FILE" \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}"

aws s3 cp "$ENCRYPTED_FILE" "s3://${BACKUP_S3_BUCKET}/${S3_KEY}" \
  --sse aws:kms \
  --metadata "timestamp=${TIMESTAMP},environment=${ENVIRONMENT},database=${DATABASE_NAME}"

MANIFEST_KEY="database/${ENVIRONMENT}/manifest.json"
EXISTING_MANIFEST=$(aws s3 cp "s3://${BACKUP_S3_BUCKET}/${MANIFEST_KEY}" - 2>/dev/null || echo "[]")
UPDATED_MANIFEST=$(echo "$EXISTING_MANIFEST" | python3 -c "
import sys, json
data = json.load(sys.stdin)
data.append({'timestamp': '${TIMESTAMP}', 's3Key': '${S3_KEY}', 'sizeBytes': ${DUMP_SIZE}})
# Keep last 35 entries
print(json.dumps(data[-35:], indent=2))
")
echo "$UPDATED_MANIFEST" | aws s3 cp - "s3://${BACKUP_S3_BUCKET}/${MANIFEST_KEY}" \
  --content-type application/json

echo "[$(date -u)] Backup complete: s3://${BACKUP_S3_BUCKET}/${S3_KEY}"
