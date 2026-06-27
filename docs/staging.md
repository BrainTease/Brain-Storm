# Staging Environment

## Overview

The staging environment is a production-mirror used to validate releases before they go live. It uses the same Docker images as production, runs against the staging database, and includes monitoring (Prometheus + Grafana).

## Starting Locally

```bash
# Required environment variables — copy and fill in
cp .env.example .env.staging

# Start all staging services
docker compose -f docker-compose.staging.yml up -d

# Run migrations
DATABASE_HOST=localhost \
DATABASE_USER=brain-storm-staging \
DATABASE_PASSWORD=<password> \
DATABASE_NAME=brain-storm-staging \
npm run migration:run --workspace=apps/backend

# (Optional) Seed with sample data
DATABASE_PASSWORD=<password> ./scripts/seed-staging-data.sh basic
```

## Required Secrets (GitHub)

| Secret | Description |
|--------|-------------|
| `STAGING_HOST` | Staging server hostname/IP |
| `STAGING_SSH_USER` | SSH user on staging server |
| `STAGING_SSH_KEY` | Private SSH key for deployment |
| `STAGING_DB_HOST` | Staging PostgreSQL host |
| `STAGING_DB_PORT` | Staging PostgreSQL port |
| `STAGING_DB_USER` | Staging database user |
| `STAGING_DB_PASSWORD` | Staging database password |
| `STAGING_JWT_SECRET` | JWT signing secret |
| `STAGING_SENTRY_DSN` | Sentry DSN for staging errors |

## Required Variables (GitHub)

| Variable | Description |
|----------|-------------|
| `STAGING_URL` | Public URL of the staging backend |
| `STAGING_API_URL` | API URL used by the frontend |
| `STAGING_GRAFANA_URL` | Grafana URL for monitoring |

## Deployment

Staging deploys automatically on every push to `main` or `develop` via the `deploy-staging.yml` workflow. Manual deploys can be triggered from the **Actions** tab with an optional data-seed step.

## Monitoring

| Service | URL |
|---------|-----|
| Backend API | `$STAGING_URL` |
| Frontend | `$STAGING_URL:3001` |
| Prometheus | `$STAGING_URL:9090` |
| Grafana | `$STAGING_URL:3002` (admin / see `GRAFANA_ADMIN_PASSWORD`) |

## Data Seeding

```bash
# Basic dataset (~100 users, ~20 courses)
./scripts/seed-staging-data.sh basic

# Performance dataset (large volume for load testing)
./scripts/seed-staging-data.sh performance

# Both datasets
./scripts/seed-staging-data.sh full
```

## Testing Against Staging

Run the load tests targeting staging:

```bash
API_URL=$STAGING_URL ./scripts/load-tests/run-all-tests.sh
```

## Differences from Production

| Aspect | Staging | Production |
|--------|---------|------------|
| Stellar network | Testnet | Mainnet |
| Resource limits | Reduced | Full |
| Database | `brain-storm-staging` | `brain-storm` |
| Auto-deploy | On push to main/develop | On release publish |
| Data | Seeded test data | Real user data |
