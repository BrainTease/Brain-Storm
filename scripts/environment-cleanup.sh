#!/bin/bash

# Environment Cleanup Script
# Automatically removes resources older than specified TTL

set -euo pipefail

ENVIRONMENT="${1:-dev}"
TTL_HOURS="${2:-24}"
DRY_RUN="${3:-false}"

echo "🧹 Starting environment cleanup for: $ENVIRONMENT"
echo "   TTL: $TTL_HOURS hours"
echo "   Dry Run: $DRY_RUN"

# Calculate cutoff time
CUTOFF_TIME=$(date -d "$TTL_HOURS hours ago" -u +%Y-%m-%dT%H:%M:%SZ)

echo "   Cutoff Time: $CUTOFF_TIME"
echo ""

# Find and cleanup EC2 instances
echo "📦 Checking EC2 instances..."
INSTANCES=$(aws ec2 describe-instances \
  --filters "Name=tag:Environment,Values=$ENVIRONMENT" \
            "Name=tag:AutoCleanup,Values=true" \
            "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[?LaunchTime<='$CUTOFF_TIME'].InstanceId" \
  --output text)

if [ -n "$INSTANCES" ]; then
  echo "   Found instances to cleanup: $INSTANCES"
  if [ "$DRY_RUN" = "false" ]; then
    aws ec2 terminate-instances --instance-ids $INSTANCES
    echo "   ✅ Terminated instances"
  else
    echo "   [DRY RUN] Would terminate: $INSTANCES"
  fi
else
  echo "   ✅ No instances to cleanup"
fi

# Find and cleanup RDS instances
echo ""
echo "🗄️  Checking RDS instances..."
RDS_INSTANCES=$(aws rds describe-db-instances \
  --query "DBInstances[?TagList[?Key=='Environment' && Value=='$ENVIRONMENT'] && TagList[?Key=='AutoCleanup' && Value=='true']].DBInstanceIdentifier" \
  --output text)

if [ -n "$RDS_INSTANCES" ]; then
  for db in $RDS_INSTANCES; do
    CREATE_TIME=$(aws rds describe-db-instances \
      --db-instance-identifier "$db" \
      --query "DBInstances[0].InstanceCreateTime" \
      --output text)
    
    if [[ "$CREATE_TIME" < "$CUTOFF_TIME" ]]; then
      echo "   Found RDS instance to cleanup: $db"
      if [ "$DRY_RUN" = "false" ]; then
        aws rds delete-db-instance \
          --db-instance-identifier "$db" \
          --skip-final-snapshot
        echo "   ✅ Deleted RDS instance: $db"
      else
        echo "   [DRY RUN] Would delete: $db"
      fi
    fi
  done
else
  echo "   ✅ No RDS instances to cleanup"
fi

# Find and cleanup S3 buckets
echo ""
echo "🪣 Checking S3 buckets..."
BUCKETS=$(aws s3api list-buckets \
  --query "Buckets[].Name" \
  --output text | tr ' ' '\n' | grep "brain-storm-$ENVIRONMENT" || true)

if [ -n "$BUCKETS" ]; then
  for bucket in $BUCKETS; do
    CREATION_DATE=$(aws s3api head-bucket --bucket "$bucket" 2>&1 | grep -i date || echo "")
    echo "   Found bucket: $bucket"
    if [ "$DRY_RUN" = "false" ]; then
      aws s3 rm "s3://$bucket" --recursive
      aws s3api delete-bucket --bucket "$bucket"
      echo "   ✅ Deleted bucket: $bucket"
    else
      echo "   [DRY RUN] Would delete: $bucket"
    fi
  done
else
  echo "   ✅ No S3 buckets to cleanup"
fi

echo ""
echo "✨ Environment cleanup completed!"
