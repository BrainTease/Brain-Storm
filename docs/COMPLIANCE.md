# PII Handling, Encryption-at-Rest & Data Compliance

## 1. PII Inventory

### 1.1 Direct Identifiers

| Field | Entity / Table | Column | Sensitivity | Notes |
|-------|---------------|--------|-------------|-------|
| Email address | `User` / `users` | `email` | **HIGH** | Unique, used for login and comms |
| Username | `User` / `users` | `username` | MEDIUM | Publicly visible handle |
| Password hash | `User` / `users` | `passwordHash` | **HIGH** | bcrypt; never returned by API |
| MFA secret | `User` / `users` | `mfaSecret` | **HIGH** | TOTP seed; never returned by API |
| MFA backup codes | `User` / `users` | `mfaBackupCodes` | **HIGH** | Hashed codes; never returned by API |
| Stellar public key | `User` / `users` | `stellarPublicKey` | MEDIUM | Blockchain address; pseudo-anonymous |
| Avatar URL | `User` / `users` | `avatar` | LOW | Public URL |
| Bio | `User` / `users` | `bio` | LOW | User-authored public text |
| Invited email | `OrganizationMember` | `invitedEmail` | **HIGH** | Stored until invite accepted/expired |
| KYC provider ID | `KycCustomer` | `providerId` | **HIGH** | Identity provider reference |
| KYC document filename | `KycDocument` | `filename` | HIGH | Document file name |
| KYC document metadata | `KycDocument` | `metadata` | HIGH | May contain identity data from provider |
| Stellar public key (KYC) | `KycCustomer` / `KycDocument` | `stellarPublicKey` | MEDIUM | Links KYC to wallet |
| Stripe customer ID | `Subscription` | `stripeCustomerId` | HIGH | Links to Stripe identity |
| Stripe subscription ID | `Subscription` | `stripeSubscriptionId` | MEDIUM | Billing reference |
| Payment error message | `Payment` | `errorMessage` | MEDIUM | May contain card/bank details from provider |

### 1.2 Indirect Identifiers / Behavioural Data

| Field | Entity / Table | Notes |
|-------|---------------|-------|
| Progress records | `Progress` | Linked to `userId`; reveals learning behaviour |
| Quiz attempts | `QuizAttempt` | Linked to `userId` |
| Enrollment records | `Enrollment` | Linked to `userId` and `courseId` |
| Credentials issued | `Credential` | Linked to `userId`; on-chain reference |
| Analytics events | `AnalyticsEvent` | Linked to `userId`; may include IP or device |
| Access logs | `AccessLog` | IP address + user agent |
| Audit logs | `AuditLog` | Actor ID + changed data snapshot |
| Email queue | `EmailQueue` | Recipient email address |
| Notification preferences | `NotificationPreference` | Contact preferences linked to `userId` |
| Search analytics | `SearchAnalytic` | Search terms may correlate to identity |

---

## 2. Data Flows

```
User registration
  ├─ Email + password received over HTTPS
  ├─ Password bcrypt-hashed before storage (never stored plain)
  └─ Email stored in users table (encrypted at rest via pgcrypto / storage-level AES-256)

KYC verification
  ├─ Documents uploaded over HTTPS
  ├─ Forwarded to third-party KYC provider (Synaps / Persona)
  ├─ Only provider reference ID stored server-side
  └─ Raw document files stored in S3 with SSE-S3 (AES-256) and pre-signed URLs

Payment
  ├─ Card details never touch Brain-Storm servers (Stripe.js / Elements)
  ├─ Stripe customer ID and payment intent ID stored in payments / subscriptions tables
  └─ Payment method details held exclusively by Stripe

Email delivery
  ├─ Recipient email passed to email queue
  ├─ Delivered via SMTP / SendGrid; not logged to application log
  └─ Email queue records purged after 30 days (see §4)
```

---

## 3. Encryption at Rest

### 3.1 Database (PostgreSQL)

| Layer | Mechanism | Status |
|-------|-----------|--------|
| Storage-level | AES-256 via managed cloud provider disk encryption (AWS RDS / GCP Cloud SQL) | Required – enforce in infrastructure provisioning |
| Column-level (mfaSecret) | Recommend `pgcrypto` `pgp_sym_encrypt` for `mfaSecret` and `mfaBackupCodes` | Planned – add migration |
| Column-level (invitedEmail in OrganizationMember) | Recommend `pgcrypto` for `invitedEmail` | Planned – add migration |
| Passwords | bcrypt (cost ≥ 12) – one-way, not reversible | Implemented |

**Immediate action (storage-level):** Confirm RDS/Cloud SQL encryption flag is enabled in Terraform/IaC before next deployment. See `infra/` Terraform files.

### 3.2 File Storage (S3 / GCS)

| Bucket | Contents | Encryption |
|--------|----------|------------|
| `brain-storm-kyc-documents` | KYC identity documents | SSE-S3 (AES-256) – must be enforced via bucket policy |
| `brain-storm-cdn-assets` | Course media, avatars | SSE-S3 (AES-256) |

Enforce with bucket policy denying `s3:PutObject` if `x-amz-server-side-encryption` header is absent.

### 3.3 Redis (Cache / Queue)

- Redis at-rest encryption: enable via `at-rest-encryption-enabled = true` in ElastiCache (or equivalent).
- Redis stores session tokens and BullMQ job payloads; job payloads should not contain raw PII — pass only IDs.

---

## 4. Log Sanitization

### Rules

1. **Never log**: email addresses, passwords, tokens, MFA secrets, KYC metadata, Stripe keys.
2. **Redact from error payloads**: replace PII with `[REDACTED]` before passing to Sentry or Winston.
3. **Allowed in logs**: user UUIDs, course IDs, timestamp, HTTP method, path, status code.

### Implementation Checklist

- [ ] Winston `format` pipeline includes a `redact` transform that strips fields: `email`, `password`, `token`, `mfaSecret`, `mfaBackupCodes`, `stripeCustomerId`, `invitedEmail`.
- [ ] Sentry `beforeSend` hook strips `request.data.password`, `request.data.email`, and any header containing `Authorization`.
- [ ] `AuditLog.changedData` snapshots must mask PII columns before storage (store hashes of email, not raw value).
- [ ] Error responses from NestJS exception filters must not echo back request body fields.

---

## 5. Data Retention & Minimisation Policy

| Data Category | Retention Period | Deletion Method |
|---------------|-----------------|-----------------|
| User account (active) | Indefinite while active | Soft-delete (`deletedAt`); hard-delete after 90 days of soft-delete |
| User account (deleted by user) | 30 days | Hard delete after 30-day grace period |
| Email queue records | 30 days | Scheduled purge job (BullMQ) |
| Access logs | 90 days | Rolling delete in `access_logs` table |
| Audit logs | 1 year (compliance) | Archive to S3 after 1 year, delete from DB |
| KYC documents | Duration of legal obligation (typically 5 years AML) | Delete from S3 after 5 years; notify provider |
| Analytics events | 2 years | Rolling delete partitioned by `createdAt` |
| Search analytics | 6 months | Rolling delete |
| Payment records | 7 years (financial regulation) | Retain in cold storage; restrict access |
| Refresh tokens | 30 days or until revoked | Delete expired entries weekly |
| Verification tokens | 24 hours | Delete on use or expiry |

### Minimisation Principles

- Collect only fields required for the stated purpose.
- `mfaBackupCodes` stored as hashed values (not plaintext) — migrate existing plaintext codes.
- `OrganizationMember.invitedEmail` deleted once invite is accepted or expired (7-day expiry).
- `KycDocument.metadata` field: store only the provider reference and status; do not cache raw provider identity JSON.

---

## 6. Subject Rights (GDPR / CCPA)

| Right | Implementation |
|-------|---------------|
| Right to access | `GET /api/users/me/export` — returns all personal data in JSON |
| Right to erasure | `DELETE /api/users/me` — triggers soft-delete + scheduled hard-delete job |
| Right to rectification | `PATCH /api/users/me` — standard profile update |
| Right to portability | Same export endpoint; JSON format |
| Right to object (marketing) | `PATCH /api/users/me/notification-preferences` |

---

## 7. Third-Party Data Processors

| Processor | Data Shared | DPA in Place | Notes |
|-----------|-------------|-------------|-------|
| Stripe | Payment method info, customer email | Yes (Stripe DPA) | Card data never touches Brain-Storm servers |
| KYC provider (Synaps/Persona) | Government ID, selfie, name | Required | Confirm DPA before go-live |
| SendGrid / SMTP | Recipient email, email body | Required | Confirm DPA |
| Sentry | Error traces (must be sanitized, see §4) | Yes (Sentry DPA) | Ensure PII scrubbing configured |
| AWS / GCP | All data at rest and in transit | Yes (AWS DPA / GCP DPA) | Confirm region is EU or appropriate |

---

## 8. Review Cadence

- **Quarterly**: Review PII inventory for new columns/tables added since last review.
- **On every schema change**: Update this document's PII inventory table.
- **Annually**: Full GDPR/CCPA compliance audit; update retention schedule if regulation changes.
