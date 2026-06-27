#!/bin/bash

# Backup Alert System
# Monitors backup status and sends alerts

set -euo pipefail

ENVIRONMENT="${1:-dev}"
ALERT_EMAIL="${2:-ops@brain-storm.dev}"
SLACK_WEBHOOK="${3:-}"

echo "🚨 Initializing backup alert system..."
echo "   Environment: $ENVIRONMENT"
echo "   Alert Email: $ALERT_EMAIL"
echo ""

# ─── Check Backup Status ──────────────────────────────────────────────────────

check_backup_status() {
  local backup_dir="$1"
  local max_age_hours="$2"
  
  # Find latest backup
  LATEST_BACKUP=$(find "$backup_dir" -type f -name "*.sql.gz" -o -name "*.tar.gz" | sort -r | head -1)
  
  if [ -z "$LATEST_BACKUP" ]; then
    return 1  # No backup found
  fi
  
  # Check backup age
  BACKUP_TIME=$(stat -f%m "$LATEST_BACKUP" 2>/dev/null || stat -c%Y "$LATEST_BACKUP" 2>/dev/null)
  CURRENT_TIME=$(date +%s)
  AGE_HOURS=$(( (CURRENT_TIME - BACKUP_TIME) / 3600 ))
  
  if [ "$AGE_HOURS" -gt "$max_age_hours" ]; then
    return 2  # Backup too old
  fi
  
  return 0  # Backup OK
}

# ─── Send Email Alert ─────────────────────────────────────────────────────────

send_email_alert() {
  local subject="$1"
  local message="$2"
  
  if command -v mail &> /dev/null; then
    echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
    echo "✅ Email alert sent"
  elif command -v sendmail &> /dev/null; then
    {
      echo "Subject: $subject"
      echo ""
      echo "$message"
    } | sendmail "$ALERT_EMAIL"
    echo "✅ Email alert sent"
  else
    echo "⚠️  Mail command not available"
  fi
}

# ─── Send Slack Alert ─────────────────────────────────────────────────────────

send_slack_alert() {
  local status="$1"
  local message="$2"
  
  if [ -z "$SLACK_WEBHOOK" ]; then
    return
  fi
  
  local color="good"
  [ "$status" = "error" ] && color="danger"
  [ "$status" = "warning" ] && color="warning"
  
  local payload=$(cat <<EOF
{
  "attachments": [
    {
      "color": "$color",
      "title": "Brain-Storm Backup Alert",
      "text": "$message",
      "fields": [
        {
          "title": "Environment",
          "value": "$ENVIRONMENT",
          "short": true
        },
        {
          "title": "Timestamp",
          "value": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
          "short": true
        }
      ]
    }
  ]
}
EOF
)
  
  curl -X POST -H 'Content-type: application/json' \
    --data "$payload" \
    "$SLACK_WEBHOOK" 2>/dev/null || true
  
  echo "✅ Slack alert sent"
}

# ─── Monitor Database Backups ─────────────────────────────────────────────────

echo "📦 Checking database backups..."
DB_BACKUP_DIR="/var/backups/database/$ENVIRONMENT"

if [ -d "$DB_BACKUP_DIR" ]; then
  if check_backup_status "$DB_BACKUP_DIR" 24; then
    echo "   ✅ Database backup OK"
  else
    MESSAGE="Database backup failed or is too old for $ENVIRONMENT"
    echo "   ❌ $MESSAGE"
    send_email_alert "Brain-Storm Backup Alert: Database" "$MESSAGE"
    send_slack_alert "error" "$MESSAGE"
  fi
else
  echo "   ⚠️  Database backup directory not found"
fi

# ─── Monitor Redis Backups ────────────────────────────────────────────────────

echo ""
echo "🔴 Checking Redis backups..."
REDIS_BACKUP_DIR="/var/backups/redis/$ENVIRONMENT"

if [ -d "$REDIS_BACKUP_DIR" ]; then
  if check_backup_status "$REDIS_BACKUP_DIR" 24; then
    echo "   ✅ Redis backup OK"
  else
    MESSAGE="Redis backup failed or is too old for $ENVIRONMENT"
    echo "   ❌ $MESSAGE"
    send_email_alert "Brain-Storm Backup Alert: Redis" "$MESSAGE"
    send_slack_alert "error" "$MESSAGE"
  fi
else
  echo "   ⚠️  Redis backup directory not found"
fi

# ─── Monitor S3 Backups ───────────────────────────────────────────────────────

echo ""
echo "🪣 Checking S3 backups..."

S3_BUCKET="brain-storm-backups-$ENVIRONMENT"
LATEST_S3_BACKUP=$(aws s3api list-objects-v2 \
  --bucket "$S3_BUCKET" \
  --prefix "backups/" \
  --query 'Contents | sort_by(@, &LastModified) | [-1]' \
  --output json 2>/dev/null || echo "{}")

if echo "$LATEST_S3_BACKUP" | jq -e '.Key' > /dev/null 2>&1; then
  LAST_MODIFIED=$(echo "$LATEST_S3_BACKUP" | jq -r '.LastModified')
  echo "   ✅ S3 backup found: $LAST_MODIFIED"
else
  MESSAGE="No S3 backups found for $ENVIRONMENT"
  echo "   ❌ $MESSAGE"
  send_email_alert "Brain-Storm Backup Alert: S3" "$MESSAGE"
  send_slack_alert "error" "$MESSAGE"
fi

echo ""
echo "✨ Backup alert check completed!"
