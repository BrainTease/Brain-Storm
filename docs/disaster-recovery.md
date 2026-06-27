# Disaster Recovery Plan

## Recovery objectives

| Tier | RTO | RPO | Examples |
|---|---|---|---|
| Critical | 1 hour | 15 minutes | Authentication, payment processing, Stellar transactions |
| High | 4 hours | 1 hour | Course delivery, progress tracking, notifications |
| Medium | 8 hours | 4 hours | Analytics, search, leaderboard |
| Low | 24 hours | 24 hours | Reports, exports, audit logs |

## Backup strategy

### PostgreSQL (RDS)
- **Automated RDS snapshots**: daily, retained for 35 days.
- **Point-in-time recovery (PITR)**: enabled with WAL archiving; allows recovery to any second within the retention window.
- **Cross-region copy**: nightly snapshot copy to `us-west-2` for regional-failure resilience.
- **Manual pre-deployment snapshots**: taken automatically by CI before every production migration.

### Redis (ElastiCache)
- **RDB snapshots**: every 6 hours, retained for 7 days.
- **Multi-AZ replication**: automatic failover to replica within ~30 seconds.
- **Export to S3**: daily export of RDB snapshot to `{env}-brain-storm-redis-backup-{account_id}`.

### Application secrets
Secrets are stored in AWS Secrets Manager with versioning. See [secret-management.md](./secret-management.md) for backup procedures.

### Static assets / uploads
- S3 bucket versioning enabled on all user-content buckets.
- Cross-region replication to `us-west-2`.

## Automated backup scripts

| Script | Purpose |
|---|---|
| `scripts/backup/database-backup.sh` | pg_dump → S3 with AES-256 encryption |
| `scripts/backup/redis-backup.sh` | BGSAVE → download RDB → upload to S3 |
| `scripts/backup/verify-backup.sh` | Restore-probe to a temporary instance |
| `scripts/backup/restore-database.sh` | Guided restore from a backup set |

Scripts are scheduled via cron on the bastion host and via AWS Backup for managed resources.

## Backup verification

All backups must be verified before they are considered valid:

1. **Automated probe (daily)**: `verify-backup.sh` restores the most recent database backup to a dedicated `verify` RDS instance and runs schema + row-count checks.
2. **Full restore drill (monthly)**: a complete restore to a staging clone is performed and application smoke tests are executed against it.
3. **Results**: verification outcomes are logged to CloudWatch (`/brain-storm/{env}/backup-verification`) and alert on failure.

## Recovery runbooks

### Runbook 1 — Database failure

```
1.  Identify scope: single-AZ failure vs. full region failure.
2.  Single-AZ: RDS Multi-AZ automatically promotes the standby (< 2 min).
    - Confirm via RDS console or CloudWatch alarm.
    - No application change required (DNS failover is automatic).
3.  Full-region failure:
    a. Promote the cross-region read replica in us-west-2.
    b. Update DATABASE_HOST in ECS task definition and Parameter Store.
    c. Trigger a new ECS deployment.
    d. Verify application health checks pass.
4.  If replica is unavailable, restore from latest cross-region snapshot:
    a. scripts/backup/restore-database.sh --snapshot <id> --region us-west-2
    b. Update DATABASE_HOST as above.
5.  Validate: run health endpoint, spot-check user data, check Stellar
    transaction references.
```

### Runbook 2 — Redis / cache failure

```
1.  ElastiCache Multi-AZ auto-failover handles single-node failures.
2.  If the entire cluster is lost:
    a. Provision a new cluster from the latest RDB export:
       scripts/backup/redis-backup.sh --restore --snapshot <s3-key>
    b. Update REDIS_URL in ECS task definition.
    c. Redeploy the application; caches will warm naturally.
3.  Rate-limit and session state will be reset; users may need to
    re-authenticate.
```

### Runbook 3 — Full application outage (ECS)

```
1.  Check ECS service events and CloudWatch logs for root cause.
2.  If a bad deployment caused the outage:
    a. scripts/rollback-deployment.sh <previous-task-definition-arn>
3.  If infrastructure is intact but containers are crash-looping:
    a. Review Sentry errors and CloudWatch logs.
    b. Fix, build, push new image, deploy.
4.  If the region is unavailable:
    a. Update Route 53 health-check failover to the DR region endpoint.
    b. Spin up ECS services in us-west-2 using the DR Terraform workspace.
```

### Runbook 4 — Secret compromise

```
1.  Immediately rotate all affected secrets (see secret-management.md).
2.  Force-revoke all active JWT sessions (restart all ECS tasks).
3.  Revoke all active API keys for affected accounts.
4.  Audit secret_access_logs and CloudTrail for the blast radius.
5.  Notify affected users per the security incident response policy.
```

## Recovery testing

| Test | Frequency | Owner |
|---|---|---|
| Automated backup verification | Daily | CI / cron |
| Redis failover drill | Monthly | Platform team |
| Full database restore to staging | Monthly | Platform team |
| Regional failover tabletop exercise | Quarterly | Platform + leadership |
| Full DR failover to us-west-2 | Annually | Platform team |

### Running a recovery test

```bash
# Verify the latest backup is restorable
./scripts/backup/verify-backup.sh

# Full restore drill to staging
./scripts/backup/restore-database.sh --env staging --snapshot latest

# Simulate Redis loss and restore
./scripts/backup/redis-backup.sh --restore --env staging --snapshot latest
```

Test results must be documented in the `docs/adr/` directory as an ADR or appended to this document under a dated "Test log" section.

## Contacts and escalation

| Role | Contact | Escalation trigger |
|---|---|---|
| On-call engineer | PagerDuty rotation | Any critical alert |
| Platform lead | — | RTO > 30 min for Critical tier |
| CTO | — | RTO > 2 hours or data loss confirmed |
| Legal / compliance | — | PII data loss or breach |

## Document maintenance

This plan is reviewed and updated:
- After every DR test.
- After any significant infrastructure change.
- At a minimum, quarterly.
