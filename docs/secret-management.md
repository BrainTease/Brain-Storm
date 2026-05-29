# Secret Management

## Overview

Brain-Storm stores all sensitive credentials in **AWS Secrets Manager**. Every access is logged and every rotation event is persisted in the database for audit purposes. A break-glass emergency-access procedure is available for production incidents.

## Secrets stored

| Path | Description |
|---|---|
| `/{env}/brain-storm/db-password` | RDS master password |
| `/{env}/brain-storm/jwt-secret` | JWT signing secret |
| `/{env}/brain-storm/stellar-secret-key` | Stellar signing key |

## Rotation

### Automatic rotation
Database passwords are automatically rotated every **90 days** in production via an AWS Secrets Manager rotation Lambda. The rotation schedule is controlled by the `secrets` Terraform module.

API keys issued through the application are automatically deactivated after 90 days by the `SecretRotationService` cron job (runs daily at 02:00 UTC).

### Manual rotation — API keys
```
POST /v1/secrets/api-keys/:id/rotate
Authorization: Bearer <jwt>
```
Returns a new raw key. The old key is immediately invalidated.

### Manual rotation — infrastructure secrets
1. Generate the new value (e.g. `openssl rand -hex 64`).
2. Update the secret in AWS Secrets Manager (`aws secretsmanager update-secret`).
3. Redeploy / restart the affected service so the new value is picked up.
4. Verify service health before closing the change.

See [secret-rotation.md](./secret-rotation.md) for per-secret runbooks.

## Access logging

Every interaction with AWS Secrets Manager via `AwsSecretsService` is recorded in the `secret_access_logs` table:

| Field | Description |
|---|---|
| `secretName` | Identifier of the secret accessed |
| `action` | `read` / `write` / `rotate` / `backup` / `emergency_access` |
| `accessedBy` | User ID (null for automated access) |
| `ipAddress` | Source IP |
| `success` | Whether the operation succeeded |
| `accessedAt` | Timestamp |

Admins can query logs via:
```
GET /v1/secrets/access-logs?secretName=...&limit=100
Authorization: Bearer <admin-jwt>
```

AWS CloudTrail also records all Secrets Manager API calls independently.

## Backup

Admin users can trigger a backup of any secret:
```
POST /v1/secrets/aws/:name/backup
Authorization: Bearer <admin-jwt>
```
The backup payload (metadata + encrypted value) is returned and should be stored in the S3 backup bucket (`{env}-brain-storm-secret-backup-{account_id}`) created by the Terraform module. Bucket versioning, KMS encryption at rest, and a 365-day retention lifecycle are pre-configured.

## Emergency access (break-glass)

In a production incident where normal credential retrieval paths are unavailable, an admin can invoke emergency access:

```
POST /v1/secrets/aws/:name/emergency-access
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{ "reason": "Production incident P0 — database unreachable" }
```

Every emergency-access call:
1. Emits a `WARN` log line with user, secret name, and reason.
2. Writes an `emergency_access` entry to `secret_access_logs`.
3. Triggers a CloudWatch alarm (`{env}-brain-storm-emergency-secret-access`) which fires an SNS notification to the security team.

After any emergency-access event, the affected secret **must** be rotated within 24 hours.

## Infrastructure (Terraform)

The `infra/terraform/modules/secrets` module provisions:

- AWS Secrets Manager secrets for DB password, JWT secret, and Stellar key.
- Automatic 90-day rotation (production only, requires a rotation Lambda ARN).
- An S3 backup bucket with versioning, KMS encryption, and lifecycle rules.
- A CloudWatch log group (`/brain-storm/{env}/secret-access`, 365-day retention).
- A break-glass IAM policy (`{env}-brain-storm-secret-emergency-access`).
- A CloudWatch alarm that fires when the emergency policy is used.

To deploy:
```bash
terraform -chdir=infra/terraform apply -target=module.secrets
```
