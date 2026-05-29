# Deployment Guide

Complete step-by-step procedures for deploying Brain-Storm to production, staging, and development environments.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedures](#deployment-procedures)
3. [Rollback Procedures](#rollback-procedures)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Deployment Troubleshooting](#deployment-troubleshooting)
6. [Deployment Templates](#deployment-templates)

---

## Pre-Deployment Checklist

Complete **every item** before deploying to production.

### Code Quality

- [ ] All CI checks passing (GitHub Actions)
- [ ] Code review approved by at least 2 maintainers
- [ ] No merge conflicts
- [ ] Commit messages follow conventions
- [ ] No `console.log()` or debug code in production branch

### Testing

- [ ] Unit tests passing: `npm run test`
- [ ] Integration tests passing: `npm run test:integration`
- [ ] E2E tests passing: `npm run test:e2e`
- [ ] Smart contracts tested: `cargo test`
- [ ] Load testing completed (if applicable)

### Database

- [ ] Backup taken and verified: `./scripts/backup/database-backup.sh`
- [ ] Migrations reviewed and tested on staging
- [ ] Migration rollback plan documented
- [ ] No breaking schema changes without migration
- [ ] `synchronize: false` in production config

### Secrets & Configuration

- [ ] All required environment variables set
- [ ] `JWT_SECRET` is 64+ random bytes
- [ ] `STELLAR_SECRET_KEY` is correct for target network
- [ ] Contract IDs match `scripts/deployed-contracts.json`
- [ ] No secrets in code or git history
- [ ] Secrets rotated if older than 90 days

### Infrastructure

- [ ] Target environment healthy (health checks passing)
- [ ] Database connections verified
- [ ] Redis cache accessible
- [ ] Stellar network accessible
- [ ] Monitoring and alerting enabled
- [ ] Rollback plan documented

### Documentation

- [ ] CHANGELOG.md updated
- [ ] Release notes prepared
- [ ] Known issues documented
- [ ] Deployment runbook reviewed
- [ ] Team notified of deployment window

---

## Deployment Procedures

### Staging Deployment

**Purpose:** Test deployment process and verify functionality before production.

**Duration:** 15-20 minutes

```bash
# 1. Verify staging environment
./scripts/health-check.sh staging

# 2. Deploy smart contracts (if changed)
./scripts/deploy.sh staging analytics
./scripts/deploy.sh staging token

# 3. Deploy backend
docker build -t brain-storm-backend:staging apps/backend/
docker push brain-storm-backend:staging
kubectl set image deployment/backend backend=brain-storm-backend:staging -n staging

# 4. Run database migrations
kubectl exec -it deployment/backend -n staging -- npm run db:migrate

# 5. Deploy frontend
npm run build:frontend
aws s3 sync apps/frontend/.next s3://brain-storm-staging-frontend/

# 6. Verify deployment
./scripts/verify-deployment.sh staging
```

### Production Deployment

**Purpose:** Deploy to production environment.

**Duration:** 30-45 minutes

**Prerequisites:** Staging deployment successful

```bash
# 1. Create release tag
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0

# 2. Verify production environment
./scripts/health-check.sh production

# 3. Backup production database
./scripts/backup/database-backup.sh production

# 4. Deploy smart contracts (if changed)
./scripts/deploy.sh mainnet analytics
./scripts/deploy.sh mainnet token

# 5. Deploy backend (blue-green)
# Blue-green deployment ensures zero downtime
docker build -t brain-storm-backend:v1.2.0 apps/backend/
docker push brain-storm-backend:v1.2.0

# Deploy to green environment
kubectl set image deployment/backend-green backend=brain-storm-backend:v1.2.0 -n production

# Wait for green to be healthy
kubectl wait --for=condition=ready pod -l app=backend-green -n production --timeout=300s

# Switch traffic to green
kubectl patch service backend -p '{"spec":{"selector":{"version":"green"}}}' -n production

# 6. Run database migrations
kubectl exec -it deployment/backend-green -n production -- npm run db:migrate

# 7. Deploy frontend
npm run build:frontend
aws s3 sync apps/frontend/.next s3://brain-storm-production-frontend/
aws cloudfront create-invalidation --distribution-id E123ABC --paths "/*"

# 8. Verify deployment
./scripts/verify-deployment.sh production

# 9. Monitor for 30 minutes
./scripts/health-check.sh production --continuous
```

### Hotfix Deployment

**Purpose:** Deploy critical fixes without waiting for release cycle.

**Duration:** 15-30 minutes

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-issue main

# 2. Make fix and test thoroughly
npm run test
npm run lint

# 3. Commit and push
git commit -m "fix: critical issue"
git push -u origin hotfix/critical-issue

# 4. Create PR and get emergency approval
# (Requires only 1 approval for hotfixes)

# 5. Merge to main
git checkout main
git merge --no-ff hotfix/critical-issue

# 6. Deploy immediately
./scripts/deploy-all.sh production
```

---

## Rollback Procedures

### Automatic Rollback

Triggered if health checks fail post-deployment:

```bash
# Kubernetes automatically rolls back if readiness probe fails
# Configured in deployment manifest with:
# - readinessProbe: checks /health endpoint
# - livenessProbe: checks /health endpoint
# - maxSurge: 1, maxUnavailable: 0 (rolling update)
```

### Manual Rollback

If automatic rollback doesn't work:

```bash
# 1. Identify previous working version
kubectl rollout history deployment/backend -n production

# 2. Rollback to previous version
kubectl rollout undo deployment/backend -n production

# 3. Verify rollback
./scripts/verify-deployment.sh production

# 4. Restore database if needed
./scripts/backup/restore-database.sh production backup-2024-05-29.sql.gz

# 5. Notify team
# Send incident report to #incidents channel
```

### Database Rollback

If migrations caused issues:

```bash
# 1. Stop application
kubectl scale deployment/backend --replicas=0 -n production

# 2. Restore database backup
./scripts/backup/restore-database.sh production backup-2024-05-29.sql.gz

# 3. Verify restore
psql -h $DATABASE_HOST -U $DATABASE_USER -d brain_storm -c "SELECT COUNT(*) FROM users;"

# 4. Restart application
kubectl scale deployment/backend --replicas=3 -n production

# 5. Verify health
./scripts/health-check.sh production
```

---

## Post-Deployment Verification

### Immediate Checks (0-5 minutes)

```bash
# 1. API health
curl https://api.brainstorm.dev/health

# 2. Database connectivity
curl https://api.brainstorm.dev/v1/health/db

# 3. Stellar network connectivity
curl https://api.brainstorm.dev/v1/health/stellar

# 4. Frontend loads
curl https://brainstorm.dev/ | grep -q "Brain-Storm"
```

### Functional Checks (5-15 minutes)

```bash
# 1. User authentication
curl -X POST https://api.brainstorm.dev/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 2. Course listing
curl https://api.brainstorm.dev/v1/courses

# 3. Stellar integration
curl https://api.brainstorm.dev/v1/stellar/balance/GXXXXXX

# 4. Frontend functionality
# - Login works
# - Courses load
# - Enrollment works
# - Progress tracking works
```

### Monitoring Checks (15-30 minutes)

```bash
# 1. Error rates
# Check Sentry dashboard for new errors

# 2. Performance metrics
# Check DataDog/New Relic for latency increase

# 3. Database performance
# Check slow query logs

# 4. API rate limiting
# Verify rate limits not being hit

# 5. User reports
# Monitor support channels for issues
```

### Automated Verification

```bash
# Run comprehensive health check
./scripts/verify-deployment.sh production

# Expected output:
# ✓ API responding
# ✓ Database connected
# ✓ Stellar network accessible
# ✓ All services healthy
# ✓ No critical errors
```

---

## Deployment Troubleshooting

### Issue: Deployment Timeout

**Symptom:** Deployment hangs or times out

**Solution:**
```bash
# Check pod status
kubectl get pods -n production

# Check logs
kubectl logs deployment/backend -n production --tail=100

# Increase timeout
kubectl rollout status deployment/backend -n production --timeout=600s

# If still failing, rollback
kubectl rollout undo deployment/backend -n production
```

### Issue: Database Migration Fails

**Symptom:** Migration error during deployment

**Solution:**
```bash
# Check migration status
npm run db:migration:status

# Revert last migration
npm run db:migration:revert

# Fix migration file
# Edit apps/backend/src/migrations/XXX.ts

# Re-run migration
npm run db:migrate

# Verify data integrity
psql -h $DATABASE_HOST -U $DATABASE_USER -d brain_storm -c "SELECT COUNT(*) FROM users;"
```

### Issue: Smart Contract Deployment Fails

**Symptom:** Contract deployment error

**Solution:**
```bash
# Check contract build
cd contracts/analytics
cargo build --target wasm32-unknown-unknown

# Verify Stellar account has funds
stellar account info $STELLAR_PUBLIC_KEY --network testnet

# Check contract ID
cat scripts/deployed-contracts.json

# Retry deployment
./scripts/deploy.sh mainnet analytics --force
```

### Issue: High Error Rate Post-Deployment

**Symptom:** Errors spike after deployment

**Solution:**
```bash
# 1. Check error logs
kubectl logs deployment/backend -n production --tail=200 | grep ERROR

# 2. Check recent changes
git log --oneline -10

# 3. Rollback if critical
kubectl rollout undo deployment/backend -n production

# 4. Investigate root cause
# - Check database state
# - Check Stellar network status
# - Check environment variables
# - Review recent code changes
```

---

## Deployment Templates

### Deployment Checklist Template

```markdown
## Deployment: v1.2.0

**Date:** 2024-05-29
**Deployer:** Alice
**Environment:** Production

### Pre-Deployment
- [ ] CI checks passing
- [ ] Code reviewed
- [ ] Database backup taken
- [ ] Migrations tested
- [ ] Secrets verified

### Deployment
- [ ] Smart contracts deployed
- [ ] Backend deployed
- [ ] Database migrations run
- [ ] Frontend deployed
- [ ] Health checks passing

### Post-Deployment
- [ ] API responding
- [ ] Database connected
- [ ] No error spikes
- [ ] User reports: none
- [ ] Monitoring normal

### Sign-off
- Deployed by: Alice
- Verified by: Bob
- Time: 14:30 UTC
```

### Incident Report Template

```markdown
## Incident: [Title]

**Date:** 2024-05-29
**Duration:** 14:30 - 14:45 UTC (15 minutes)
**Severity:** P1 | P2 | P3

### Impact
- Affected users: [number]
- Services down: [list]
- Data loss: [yes/no]

### Root Cause
[Description of what went wrong]

### Timeline
- 14:30 - Issue detected
- 14:35 - Rollback initiated
- 14:45 - Service restored

### Resolution
[What was done to fix it]

### Prevention
[What we'll do to prevent this]

### Follow-up
- [ ] Post-mortem scheduled
- [ ] Monitoring improved
- [ ] Documentation updated
```

---

## Deployment Contacts

| Role | Name | Contact |
|------|------|---------|
| DevOps Lead | Alice | alice@brainstorm.dev |
| Backend Lead | Bob | bob@brainstorm.dev |
| On-Call | [Rotation] | oncall@brainstorm.dev |

---

## Related Documentation

- [Deployment Runbook](./deployment-runbook.md) — Detailed procedures
- [Disaster Recovery](./disaster-recovery.md) — Recovery procedures
- [Monitoring & Observability](./monitoring-observability.md) — Monitoring setup
- [CI/CD Pipelines](./ci-cd-pipelines.md) — Automated deployment
