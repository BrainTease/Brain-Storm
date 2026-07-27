#!/bin/bash

# Test Data Seeding Script
# Usage: ./scripts/seed-test-data.sh [environment] [data-set]
# Example: ./scripts/seed-test-data.sh development basic

set -e

ENVIRONMENT=${1:-development}
DATA_SET=${2:-basic}

echo "🌱 Seeding test data for environment: $ENVIRONMENT"
echo "📦 Data set: $DATA_SET"

# Check if environment is valid
if [[ ! "$ENVIRONMENT" =~ ^(development|test|staging)$ ]]; then
    echo "❌ Invalid environment. Use: development, test, or staging"
    exit 1
fi

# Set database connection based on environment
case $ENVIRONMENT in
    "development")
        export DATABASE_NAME="brain-storm-dev"
        ;;
    "test")
        export DATABASE_NAME="brain-storm-test"
        ;;
    "staging")
        export DATABASE_NAME="brain-storm-staging"
        ;;
esac

echo "🔗 Using database: $DATABASE_NAME"

# Run the seeding script
cd "$(dirname "$0")/.."
npm run seed:$DATA_SET --workspace=apps/backend

echo "✅ Test data seeding completed successfully!"
