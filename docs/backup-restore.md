# Backup and Restore Procedures

## Overview

All backups are stored in an S3 bucket (`{env}-brain-storm-backup-{account_id}`) with:
- Server-side encryption using AWS KMS.
- Additional AES-256-CBC application-layer encryption via `BACKUP_ENCRYPTION_KEY`.
- Versioning enabled to protect against accidental overwrites.
- Lifecycle rules enforcing retention limits.

## Required environment variables

| Variable | Purpose |
|---|---|
| `BACKUP_S3_BUCKET` | Target S3 bucket name |
| `BACKUP_ENCRYPTION_KEY` | Passphrase for AES-256 encryption/decryption |
| `DATABASE_HOST` | PostgreSQL host |
| `DATABASE_USER` | PostgreSQL user |
| `DATABASE_PASSWORD` | PostgreSQL password |
| `DATABASE_NAME` | PostgreSQL database name |
| `REDIS_HOST` | Redis host |
| `ENVIRONMENT` | Environment tag (`dev`, `staging`, `prod`) |

## Automated backups

### Database (PostgreSQL)
Scheduled daily at **01:00 UTC** via cron on the bastion host:

```bash
0 1 * * * /opt/brain-storm/scripts/backup/database-backup.sh >> /var/log/brain-storm-backup.log 2>&1
```

The script:
1. Runs `pg_dump` with compression level 9.
2. Encrypts the output with AES-256-CBC (`encrypt-backup.sh`).
3. Uploads to `s3://$BACKUP_S3_BUCKET/database/$ENVIRONMENT/$TIMESTAMP/backup.sql.gz.enc`.
4. Updates `database/$ENVIRONMENT/manifest.json` (last 35 entries).

### Redis
Scheduled every **6 hours** via cron:

```bash
0 */6 * * * /opt/brain-storm/scripts/backup/redis-backup.sh >> /var/log/brain-storm-redis-backup.log 2>&1
```

## Backup verification

Verification runs **daily at 03:00 UTC**:

```bash
0 3 * * * /opt/brain-storm/scripts/backup/verify-backup.sh >> /var/log/brain-storm-verify.log 2>&1
```

`verify-backup.sh`:
1. Reads the latest entry from the manifest.
2. Downloads and decrypts the backup.
3. Restores to an isolated `VERIFY_DB_HOST` instance.
4. Runs row-count checks on core tables (`users`, `courses`, `audit_logs`, `secret_rotations`).
5. Verifies the schema has at least 10 tables.
6. Publishes a `SUCCESS` or `FAILURE` event to CloudWatch Logs (`/brain-storm/{env}/backup-verification`).
7. Exits non-zero on failure — the cron health monitor will alert on-call.

## Backup encryption

All database dumps are encrypted with AES-256-CBC before upload. You can encrypt or decrypt any file manually:

```bash
# Encrypt
BACKUP_ENCRYPTION_KEY=<key> ./scripts/backup/encrypt-backup.sh \
  --encrypt --in backup.sql.gz --out backup.sql.gz.enc

# Decrypt
BACKUP_ENCRYPTION_KEY=<key> ./scripts/backup/encrypt-backup.sh \
  --decrypt --in backup.sql.gz.enc --out backup.sql.gz
```

The key is stored in AWS Secrets Manager at `/{env}/brain-storm/backup-encryption-key` and injected into the cron environment by the startup script.

## Retention policy

| Data type | Retention |
|---|---|
| Database backups (S3) | 35 days |
| Redis RDB snapshots (S3) | 7 days |
| RDS automated snapshots | 35 days (managed by AWS) |
| ElastiCache RDB exports | 7 days |

The `retention-cleanup.sh` script enforces this policy and runs weekly:

```bash
0 4 * * 0 /opt/brain-storm/scripts/backup/retention-cleanup.sh >> /var/log/brain-storm-cleanup.log 2>&1
```

Run in dry-run mode to preview what would be deleted:
```bash
DRY_RUN=true ./scripts/backup/retention-cleanup.sh
```

## Restore procedures

### Restore the database (latest backup)

```bash
export DATABASE_HOST=<target-host>
export DATABASE_USER=<user>
export DATABASE_PASSWORD=<password>
export DATABASE_NAME=<dbname>
export BACKUP_S3_BUCKET=<bucket>
export BACKUP_ENCRYPTION_KEY=<key>
export ENVIRONMENT=prod

./scripts/backup/restore-database.sh
```

The script fetches the latest snapshot from the manifest, prompts for confirmation, drops the existing schema, and restores. A row-count check on `users` is printed at the end.

### Restore a specific snapshot

```bash
./scripts/backup/restore-database.sh \
  --snapshot database/prod/20260101T010000Z/backup.sql.gz.enc
```

### Restore Redis

```bash
export REDIS_HOST=<host>
export BACKUP_S3_BUCKET=<bucket>
export ENVIRONMENT=prod

# Restore latest
./scripts/backup/redis-backup.sh --restore --snapshot redis/prod/20260101T060000Z/dump.rdb

# After restore, validate with:
redis-cli -h "$REDIS_HOST" INFO keyspace
```

## S3 object layout

```
{bucket}/
  database/
    {env}/
      manifest.json          ← index of all database backups (last 35)
      {timestamp}/
        backup.sql.gz.enc    ← encrypted dump
  redis/
    {env}/
      {timestamp}/
        dump.rdb             ← raw Redis RDB file
```

## Related documentation

- [Disaster Recovery Plan](./disaster-recovery.md)
- [Secret Management](./secret-management.md)
- [Deployment Runbook](./deployment-runbook.md)
