# Secret Rotation Procedures

## Overview

Brain-Storm implements automated and manual secret rotation to minimize exposure from compromised credentials.

## API Key Rotation

### Automated Rotation
API keys older than **90 days** are automatically deactivated daily at 2 AM UTC via a scheduled cron job.

### Manual Rotation
Users can rotate their own API keys via:
```
POST /v1/secrets/api-keys/:id/rotate
Authorization: Bearer <jwt>
```
Returns a new raw API key. The old key is immediately invalidated.

## JWT Signing Keys

JWT secrets are configured via the `JWT_SECRET` environment variable. To rotate:

1. Generate a new secret: `openssl rand -hex 64`
2. Update `JWT_SECRET` in your environment/secrets manager
3. Restart the application — all existing tokens will be invalidated
4. Users will need to re-authenticate

**Note:** For zero-downtime rotation, implement a `JWT_SECRET_PREVIOUS` env var and accept both during a transition window.

## Database Password Rotation

1. Generate a new password in your secrets manager (AWS Secrets Manager, Vault, etc.)
2. Update the database user password
3. Update `DATABASE_PASSWORD` environment variable
4. Restart the application

## Stellar Account Key Rotation

Stellar keys (`STELLAR_SECRET_KEY`) should be rotated by:

1. Generate a new Stellar keypair
2. Transfer any required XLM/assets to the new account
3. Update `STELLAR_SECRET_KEY` in environment
4. Restart the application

**Warning:** Ensure the new account is funded and has the required trustlines before switching.

## SMTP Password Rotation

1. Generate a new SMTP credential in your mail provider.
2. Update the secret: `aws secretsmanager update-secret --secret-id /{env}/brain-storm/smtp-password --secret-string '<new-password>'`
3. Restart the backend service to pick up the new value.
4. Verify email delivery by triggering a test notification.

## Admin API Key Rotation

1. Generate a new key: `openssl rand -hex 32`
2. Update the secret: `aws secretsmanager update-secret --secret-id /{env}/brain-storm/admin-api-key --secret-string '<new-key>'`
3. Update any external integrations that use the admin API key.
4. Restart the backend.
5. Invalidate the old key in the `api_keys` table if it was also stored there.

## Rotation History

Admins can view rotation history:
```
GET /v1/secrets/rotation-history?secretType=api_key&limit=50
Authorization: Bearer <admin-jwt>
```

## Rotation Log

All rotations are recorded in the `secret_rotations` table with:
- `secretType`: type of secret rotated
- `identifier`: specific key/resource ID
- `rotatedBy`: user who triggered rotation (null for automated)
- `automated`: whether rotation was triggered by the scheduler
- `rotatedAt`: timestamp
