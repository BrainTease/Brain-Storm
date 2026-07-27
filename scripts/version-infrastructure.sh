#!/bin/bash

# Infrastructure Versioning Script
# Manages infrastructure versions and tracks changes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../terraform"
VERSIONS_DIR="${TERRAFORM_DIR}/.versions"

mkdir -p "$VERSIONS_DIR"

echo "📦 Infrastructure Versioning"
echo "============================"
echo ""

# Get current versions
echo "1️⃣  Collecting Infrastructure Versions"
echo "-------------------------------------"

# Terraform version
TERRAFORM_VERSION=$(terraform version | head -1 | awk '{print $2}')
echo "Terraform: $TERRAFORM_VERSION"

# AWS Provider version
AWS_PROVIDER_VERSION=$(grep -A 2 'source.*hashicorp/aws' "$TERRAFORM_DIR/main.tf" | grep version | awk -F'"' '{print $2}' || echo "unknown")
echo "AWS Provider: $AWS_PROVIDER_VERSION"

# Get all module versions
echo ""
echo "2️⃣  Module Versions"
echo "------------------"
for module_dir in "$TERRAFORM_DIR"/modules/*/; do
  module_name=$(basename "$module_dir")
  if [ -f "$module_dir/variables.tf" ]; then
    echo "Module: $module_name"
  fi
done

echo ""
echo "3️⃣  Creating Version Snapshot"
echo "----------------------------"

# Create version snapshot
SNAPSHOT_FILE="$VERSIONS_DIR/versions-$(date +%Y%m%d-%H%M%S).json"
cat > "$SNAPSHOT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_commit": "$(cd $TERRAFORM_DIR && git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(cd $TERRAFORM_DIR && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "terraform_version": "$TERRAFORM_VERSION",
  "aws_provider_version": "$AWS_PROVIDER_VERSION",
  "environment": "${ENVIRONMENT:-unknown}",
  "region": "${AWS_REGION:-unknown}"
}
EOF

echo "✅ Version snapshot created: $SNAPSHOT_FILE"

# Keep only last 30 snapshots
echo ""
echo "4️⃣  Cleaning Old Snapshots"
echo "-------------------------"
SNAPSHOT_COUNT=$(ls -1 "$VERSIONS_DIR"/versions-*.json 2>/dev/null | wc -l)
if [ "$SNAPSHOT_COUNT" -gt 30 ]; then
  echo "Removing old snapshots (keeping last 30)..."
  ls -1t "$VERSIONS_DIR"/versions-*.json | tail -n +31 | xargs rm -f
  echo "✅ Cleanup completed"
else
  echo "✅ No cleanup needed ($SNAPSHOT_COUNT snapshots)"
fi

# Generate version report
echo ""
echo "5️⃣  Generating Version Report"
echo "----------------------------"

cat > "$VERSIONS_DIR/VERSIONS.md" << EOF
# Infrastructure Versions

**Last Updated**: $(date)

## Current Versions

| Component | Version |
|-----------|---------|
| Terraform | $TERRAFORM_VERSION |
| AWS Provider | $AWS_PROVIDER_VERSION |

## Version History

EOF

# Add last 10 snapshots to report
echo "### Recent Snapshots" >> "$VERSIONS_DIR/VERSIONS.md"
echo "" >> "$VERSIONS_DIR/VERSIONS.md"
ls -1t "$VERSIONS_DIR"/versions-*.json 2>/dev/null | head -10 | while read snapshot; do
  TIMESTAMP=$(jq -r '.timestamp' "$snapshot")
  COMMIT=$(jq -r '.git_commit' "$snapshot" | cut -c1-7)
  BRANCH=$(jq -r '.git_branch' "$snapshot")
  echo "- $TIMESTAMP (commit: $COMMIT, branch: $BRANCH)" >> "$VERSIONS_DIR/VERSIONS.md"
done

echo "✅ Version report generated: $VERSIONS_DIR/VERSIONS.md"

# Display current versions
echo ""
echo "📋 Current Infrastructure Versions"
echo "=================================="
cat "$SNAPSHOT_FILE" | jq '.'

echo ""
echo "✅ Infrastructure versioning completed"
