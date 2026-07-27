#!/bin/bash
set -e

# Seed realistic but anonymised data into the staging environment.
# Usage: ./scripts/seed-staging-data.sh [basic|performance|full]

SEED_TYPE="${1:-basic}"

echo "Seeding staging environment with dataset: $SEED_TYPE"

: "${DATABASE_HOST:=localhost}"
: "${DATABASE_PORT:=5432}"
: "${DATABASE_USER:=brain-storm-staging}"
: "${DATABASE_PASSWORD:?DATABASE_PASSWORD must be set}"
: "${DATABASE_NAME:=brain-storm-staging}"

export DATABASE_HOST DATABASE_PORT DATABASE_USER DATABASE_PASSWORD DATABASE_NAME

cd "$(dirname "$0")/.."

case "$SEED_TYPE" in
  basic)
    npm run seed:basic --workspace=apps/backend
    ;;
  performance)
    npm run seed:performance --workspace=apps/backend
    ;;
  full)
    npm run seed:basic --workspace=apps/backend
    npm run seed:performance --workspace=apps/backend
    ;;
  *)
    echo "Unknown seed type '$SEED_TYPE'. Use: basic | performance | full"
    exit 1
    ;;
esac

echo "Staging data seeding completed."
