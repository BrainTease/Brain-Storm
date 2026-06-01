# Automated Backup Verification

This document describes the automated backup verification system for Brain-Storm.

## Overview

The backup verification system automatically validates backup integrity, tests restore procedures, and monitors backup status with alerts.

## Features

- **Backup Validation**: Integrity checks for all backup files
- **Restore Testing**: Dry-run restore tests to ensure recoverability
- **Backup Integrity Checks**: Verify file corruption and completeness
- **Backup Reports**: Detailed JSON reports of verification results
- **Backup Alerts**: Email and Slack notifications for backup failures
- **Redundancy Monitoring**: Ensure multiple backup copies exist

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Automated Backup Verification                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Backup Files    │  │  Verification    │               │
│  │  (DB, Redis, S3) │──│  Script          │               │
│  └──────────────────┘  └──────────────────┘               │
│           │                      │                         │
│           └──────────┬───────────┘                         │
│                      │                                     │
│           ┌──────────▼──────────┐                         │
│           │  Integrity Checks   │                         │
│           │  - File corruption  │                         │
│           │  - Size validation  │                         │
│           │  - Timestamp check  │                         │
│           └──────────┬──────────┘                         │
│                      │                                     │
│           ┌──────────▼──────────┐                         │
│           │  Restore Testing    │                         │
│           │  - Dry run restore  │                         │
│           │  - Data validation  │                         │
│           └──────────┬──────────┘                         │
│                      │                                     │
│           ┌──────────▼──────────┐                         │
│           │  Alert System       │                         │
│           │  - Email alerts     │                         │
│           │  - Slack alerts     │                         │
│           └────────────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Verify Backup Integrity

```bash
# Verify backups in default location
./scripts/backup/verify-backup-integrity.sh

# Verify specific backup directory
./scripts/backup/verify-backup-integrity.sh /var/backups/database/dev

# Specify environment and report file
./scripts/backup/verify-backup-integrity.sh /var/backups/database/dev dev backup-report.json
```

### Monitor Backup Status

```bash
# Check backup status with alerts
./scripts/backup/backup-alerts.sh dev ops@brain-storm.dev

# With Slack webhook
./scripts/backup/backup-alerts.sh dev ops@brain-storm.dev https://hooks.slack.com/services/...
```

### View Verification Report

```bash
# Pretty print report
cat backup-verification-report.json | jq '.'

# Check specific check result
cat backup-verification-report.json | jq '.checks[] | select(.name == "file_integrity")'

# Get overall status
cat backup-verification-report.json | jq '.overall_status'
```

## Verification Checks

### 1. File Integrity Check

Validates that backup files are not corrupted:

```bash
gzip -t backup.sql.gz
```

**Status**: ✅ Pass if all files decompress successfully

### 2. Backup Size Validation

Ensures backups are not empty:

```bash
# Check file size > 0
stat -c%s backup.sql.gz
```

**Status**: ✅ Pass if all backups > 0 bytes

### 3. Backup Timestamp Validation

Verifies backups are recent (< 7 days old):

```bash
# Check modification time
stat -c%Y backup.sql.gz
```

**Status**: ✅ Pass if all backups < 7 days old

### 4. Restore Test (Dry Run)

Tests restore procedure without modifying data:

```bash
# Test decompression
gunzip -t backup.sql.gz
```

**Status**: ✅ Pass if restore test succeeds

### 5. Encryption Validation

Verifies backups are encrypted:

```bash
# Check encryption header
file backup.sql.gz.enc
```

**Status**: ✅ Pass if encryption detected

### 6. Redundancy Check

Ensures multiple backup copies exist:

```bash
# Count backups
find /var/backups -name "*.sql.gz" | wc -l
```

**Status**: ✅ Pass if >= 3 backups found

## Report Format

Verification reports are JSON files with the following structure:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "dev",
  "overall_status": "pass",
  "checks": [
    {
      "name": "file_integrity",
      "status": "pass"
    },
    {
      "name": "backup_size",
      "status": "pass"
    },
    {
      "name": "backup_timestamp",
      "status": "pass"
    },
    {
      "name": "restore_test",
      "status": "pass"
    },
    {
      "name": "encryption",
      "status": "pass"
    },
    {
      "name": "redundancy",
      "status": "pass"
    }
  ]
}
```

## Alert Configuration

### Email Alerts

Configure email alerts in `backup-alerts.sh`:

```bash
ALERT_EMAIL="ops@brain-storm.dev"
```

Requires mail or sendmail to be installed:

```bash
# Ubuntu/Debian
sudo apt-get install mailutils

# macOS
# Built-in mail command
```

### Slack Alerts

Configure Slack webhook:

```bash
./scripts/backup/backup-alerts.sh dev ops@brain-storm.dev https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Create webhook at: https://api.slack.com/messaging/webhooks

## Scheduling

### Cron Job for Verification

```bash
# Run verification daily at 2 AM
0 2 * * * /workspaces/Brain-Storm/scripts/backup/verify-backup-integrity.sh /var/backups/database/dev dev >> /var/log/backup-verification.log 2>&1

# Run alerts every 6 hours
0 */6 * * * /workspaces/Brain-Storm/scripts/backup/backup-alerts.sh dev ops@brain-storm.dev >> /var/log/backup-alerts.log 2>&1
```

### GitHub Actions Workflow

```yaml
name: Backup Verification
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Verify backups
        run: ./scripts/backup/verify-backup-integrity.sh
      - name: Check alerts
        run: ./scripts/backup/backup-alerts.sh dev ${{ secrets.ALERT_EMAIL }}
```

## Best Practices

1. **Run verification daily**: Catch backup issues early
2. **Test restore regularly**: Ensure recovery procedures work
3. **Monitor alerts**: Set up email/Slack notifications
4. **Keep multiple copies**: Maintain at least 3 backup copies
5. **Encrypt backups**: Always encrypt sensitive data
6. **Document procedures**: Keep runbooks updated
7. **Test disaster recovery**: Perform full restore tests quarterly

## Troubleshooting

### Backup verification fails

```bash
# Check backup file
file /var/backups/database/dev/backup.sql.gz

# Test decompression
gunzip -t /var/backups/database/dev/backup.sql.gz

# Check file permissions
ls -la /var/backups/database/dev/
```

### Alerts not sending

```bash
# Test email
echo "Test" | mail -s "Test" ops@brain-storm.dev

# Check mail logs
tail -f /var/log/mail.log

# Test Slack webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test"}' \
  https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Restore test fails

```bash
# Check backup integrity
gzip -t /var/backups/database/dev/backup.sql.gz

# Check disk space
df -h /var/backups

# Check file permissions
chmod 644 /var/backups/database/dev/backup.sql.gz
```

## Related Documentation

- [Backup and Restore](./backup-restore.md)
- [Disaster Recovery](./disaster-recovery.md)
- [Monitoring and Observability](./monitoring-observability.md)
