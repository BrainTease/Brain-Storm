#!/usr/bin/env bash
# inject-secrets.sh — Pull secrets from AWS Secrets Manager at container startup
# and export them as environment variables for the process that follows.
#
# Usage:
#   source scripts/inject-secrets.sh [environment]
#   # or as a container entrypoint wrapper:
#   scripts/inject-secrets.sh node dist/main.js
#
# Required env vars:
#   AWS_REGION       — AWS region (default: us-east-1)
#   ENVIRONMENT      — deployment environment (production/staging)
#
# Secrets fetched (AWS Secrets Manager paths):
#   /{env}/brain-storm/db-password     → DATABASE_PASSWORD
#   /{env}/brain-storm/jwt-secret      → JWT_SECRET
#   /{env}/brain-storm/stellar-secret  → STELLAR_SECRET_KEY
#   /{env}/brain-storm/smtp-password   → SMTP_PASSWORD
#   /{env}/brain-storm/admin-api-key   → ADMIN_API_KEY

set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"

log() { echo "[inject-secrets] $(date -u +%H:%M:%SZ) $*" >&2; }

fetch_secret() {
  local secret_name="$1"
  local export_as="$2"

  local value
  value=$(aws secretsmanager get-secret-value \
    --region "$AWS_REGION" \
    --secret-id "$secret_name" \
    --query SecretString \
    --output text 2>/dev/null) || {
    log "ERROR: Failed to fetch secret $secret_name"
    return 1
  }

  export "$export_as"="$value"
  log "Injected: $export_as (from $secret_name)"
}

log "Injecting secrets for environment: $ENVIRONMENT"

fetch_secret "/${ENVIRONMENT}/brain-storm/db-password"    DATABASE_PASSWORD
fetch_secret "/${ENVIRONMENT}/brain-storm/jwt-secret"     JWT_SECRET
fetch_secret "/${ENVIRONMENT}/brain-storm/stellar-secret" STELLAR_SECRET_KEY
fetch_secret "/${ENVIRONMENT}/brain-storm/smtp-password"  SMTP_PASSWORD
fetch_secret "/${ENVIRONMENT}/brain-storm/admin-api-key"  ADMIN_API_KEY

log "All secrets injected successfully"

# If arguments were passed, exec the command with the injected environment
if [[ $# -gt 0 ]]; then
  exec "$@"
fi
