#!/usr/bin/env bash
# Trigger a Redis BGSAVE, download the RDB file, and upload to S3.
# Pass --restore to restore from a snapshot instead.
set -euo pipefail

: "${REDIS_HOST:?REDIS_HOST is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"

MODE="backup"
SNAPSHOT_KEY=""
ENVIRONMENT="${ENVIRONMENT:-unknown}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --restore) MODE="restore"; shift ;;
    --snapshot) SNAPSHOT_KEY="$2"; shift 2 ;;
    --env) ENVIRONMENT="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
RDB_FILE="/tmp/redis-dump-${ENVIRONMENT}-${TIMESTAMP}.rdb"
S3_KEY="redis/${ENVIRONMENT}/${TIMESTAMP}/dump.rdb"

cleanup() { rm -f "$RDB_FILE"; }
trap cleanup EXIT

if [[ "$MODE" == "backup" ]]; then
  echo "[$(date -u)] Triggering Redis BGSAVE on ${REDIS_HOST}..."
  redis-cli -h "$REDIS_HOST" BGSAVE

  for i in {1..30}; do
    STATUS=$(redis-cli -h "$REDIS_HOST" LASTSAVE)
    sleep 2
    NEW_STATUS=$(redis-cli -h "$REDIS_HOST" LASTSAVE)
    if [[ "$NEW_STATUS" != "$STATUS" ]]; then
      echo "[$(date -u)] BGSAVE completed."
      break
    fi
    if [[ $i -eq 30 ]]; then
      echo "[$(date -u)] ERROR: BGSAVE did not complete in 60 seconds" >&2
      exit 1
    fi
  done

  RDB_DIR=$(redis-cli -h "$REDIS_HOST" CONFIG GET dir | tail -1)
  RDB_FILENAME=$(redis-cli -h "$REDIS_HOST" CONFIG GET dbfilename | tail -1)
  scp "${REDIS_HOST}:${RDB_DIR}/${RDB_FILENAME}" "$RDB_FILE" 2>/dev/null \
    || aws s3 cp "s3://${BACKUP_S3_BUCKET}/redis-live/${RDB_FILENAME}" "$RDB_FILE"

  aws s3 cp "$RDB_FILE" "s3://${BACKUP_S3_BUCKET}/${S3_KEY}" \
    --sse aws:kms \
    --metadata "timestamp=${TIMESTAMP},environment=${ENVIRONMENT}"

  echo "[$(date -u)] Redis backup complete: s3://${BACKUP_S3_BUCKET}/${S3_KEY}"

else
  : "${SNAPSHOT_KEY:?--snapshot <s3-key> is required for restore mode}"
  echo "[$(date -u)] Restoring Redis from s3://${BACKUP_S3_BUCKET}/${SNAPSHOT_KEY}..."

  aws s3 cp "s3://${BACKUP_S3_BUCKET}/${SNAPSHOT_KEY}" "$RDB_FILE"

  RDB_DIR=$(redis-cli -h "$REDIS_HOST" CONFIG GET dir | tail -1)
  RDB_FILENAME=$(redis-cli -h "$REDIS_HOST" CONFIG GET dbfilename | tail -1)
  TARGET="${RDB_DIR}/${RDB_FILENAME}"

  echo "[$(date -u)] Stopping Redis writes..."
  redis-cli -h "$REDIS_HOST" CONFIG SET save ""
  redis-cli -h "$REDIS_HOST" BGSAVE

  cp "$RDB_FILE" "$TARGET"

  echo "[$(date -u)] Restarting Redis to load RDB..."
  redis-cli -h "$REDIS_HOST" DEBUG RELOAD 2>/dev/null || true

  echo "[$(date -u)] Redis restore complete from ${SNAPSHOT_KEY}"
fi
