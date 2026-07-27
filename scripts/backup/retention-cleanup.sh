#!/usr/bin/env bash
# Delete backup objects from S3 that exceed the retention policy.
# Policy:
#   database/  — keep 35 days
#   redis/     — keep 7 days
set -euo pipefail

: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"

ENVIRONMENT="${ENVIRONMENT:-unknown}"
DB_RETENTION_DAYS="${DB_RETENTION_DAYS:-35}"
REDIS_RETENTION_DAYS="${REDIS_RETENTION_DAYS:-7}"
DRY_RUN="${DRY_RUN:-false}"

log() { echo "[$(date -u)] $*"; }

delete_older_than() {
  local prefix="$1"
  local retention_days="$2"
  local cutoff
  cutoff=$(date -u -d "${retention_days} days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
    || date -u -v "-${retention_days}d" +%Y-%m-%dT%H:%M:%SZ)

  log "Scanning s3://${BACKUP_S3_BUCKET}/${prefix} (cutoff: ${cutoff})..."

  aws s3api list-objects-v2 \
    --bucket "$BACKUP_S3_BUCKET" \
    --prefix "$prefix" \
    --query "Contents[?LastModified<='${cutoff}'].[Key]" \
    --output text | while read -r key; do
      [[ -z "$key" || "$key" == "None" ]] && continue
      if [[ "$DRY_RUN" == "true" ]]; then
        log "  DRY-RUN would delete: ${key}"
      else
        aws s3 rm "s3://${BACKUP_S3_BUCKET}/${key}"
        log "  Deleted: ${key}"
      fi
    done
}

delete_older_than "database/${ENVIRONMENT}/" "$DB_RETENTION_DAYS"
delete_older_than "redis/${ENVIRONMENT}/"    "$REDIS_RETENTION_DAYS"

log "Retention cleanup complete (dry_run=${DRY_RUN})"
