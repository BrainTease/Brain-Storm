# Security Testing Checklist

## Overview

Repeatable penetration testing checklist mapped to OWASP Top 10 (2021) categories. Run this against staging before every major release and after significant auth, API, or file-handling changes.

---

## How to Use

1. Assign a tester and a target environment (staging URL).
2. Work through each section. Mark each item **PASS**, **FAIL**, or **N/A**.
3. For each **FAIL**, file an issue with severity (`CRITICAL / HIGH / MEDIUM / LOW`) and an owner.
4. After fixes are deployed, re-run only the failed items and update the **Re-test** column.

---

## Checklist

### A01 – Broken Access Control

| # | Test | Method | Pass/Fail | Severity | Issue # | Re-test |
|---|------|--------|-----------|----------|---------|---------|
| 1.1 | Unauthenticated access to `/api/*` endpoints returns 401 | Send requests without Authorization header | | | | |
| 1.2 | Student cannot access instructor-only endpoints (`/api/courses/:id/publish`, `/api/admin/*`) | Use student JWT on instructor routes | | | | |
| 1.3 | **IDOR – User profile**: `GET /api/users/:otherId` returns 403 for non-admin | Use own valid JWT, swap `:otherId` to another user's UUID | | | | |
| 1.4 | **IDOR – Enrollment**: `GET /api/users/:id/progress` is scoped to own user | Swap user ID in path with another enrolled user's ID | | | | |
| 1.5 | **IDOR – Credential**: `GET /api/credentials/:id` owned by another user returns 403 | Enumerate credential UUIDs | | | | |
| 1.6 | **IDOR – KYC documents**: `GET /api/kyc/documents/:id` is owner-scoped | Swap document UUID | | | | |
| 1.7 | Admin-only analytics endpoints reject non-admin roles | Use instructor/student JWT on `/api/admin/analytics/*` | | | | |
| 1.8 | JWT `role` claim cannot be self-elevated | Forge a JWT with `"role":"admin"` and send a request | | | | |
| 1.9 | Soft-deleted users cannot authenticate | `deletedAt` is set; attempt login | | | | |
| 1.10 | Organization member cannot access another org's resources | Use member JWT with a different `orgId` in path | | | | |

### A02 – Cryptographic Failures

| # | Test | Method | Pass/Fail | Severity | Issue # | Re-test |
|---|------|--------|-----------|----------|---------|---------|
| 2.1 | Passwords stored as bcrypt hash (not plaintext or MD5) | Inspect `users.passwordHash` column; verify bcrypt prefix `$2b$` | | | | |
| 2.2 | MFA secrets not returned in API responses | `GET /api/users/me` must omit `mfaSecret` and `mfaBackupCodes` | | | | |
| 2.3 | Verification tokens not returned after use | `GET /api/users/me` must omit `verificationToken` | | | | |
| 2.4 | API is HTTPS-only; HTTP redirects to HTTPS | Send `http://` request; verify 301/308 redirect | | | | |
| 2.5 | Sensitive DB columns (mfaSecret, passwordHash) not visible in logs | Trigger an auth flow; grep app logs for secret values | | | | |
| 2.6 | JWT signed with HS256/RS256 and strong secret (≥ 256 bits) | Decode JWT header; attempt signature bypass with `alg:none` | | | | |
| 2.7 | Refresh tokens are single-use (rotated on use) | Reuse a consumed refresh token; must return 401 | | | | |
| 2.8 | Stellar private keys never stored server-side | Audit codebase and DB for any `privateKey` column | | | | |

### A03 – Injection

| # | Test | Method | Pass/Fail | Severity | Issue # | Re-test |
|---|------|--------|-----------|----------|---------|---------|
| 3.1 | SQL injection on search params | `GET /api/courses?search=' OR 1=1--` | | | | |
| 3.2 | SQL injection on user listing | `GET /api/admin/users?search='; DROP TABLE users;--` | | | | |
| 3.3 | TypeORM parameterized queries used everywhere (no raw string concatenation) | Grep codebase for `query(` with template literals | | | | |
| 3.4 | Stored XSS – course title/description sanitized before storage and output | Submit `<script>alert(1)</script>` as course title; verify it is escaped in response | | | | |
| 3.5 | Stored XSS – forum post content sanitized | Submit script tag in forum post body | | | | |
| 3.6 | NoSQL injection (if any MongoDB/Redis query accepts user input) | Fuzz Redis cache key inputs | | | | |
| 3.7 | GraphQL – depth and complexity limits enforced | Send deeply nested query (depth > 10); must return 400 | | | | |
| 3.8 | GraphQL – introspection disabled in production | `POST /graphql {"query":"{__schema{types{name}}}"}` returns 403 in prod | | | | |
| 3.9 | Email header injection via contact forms | Inject `\r\nBcc:` in email fields | | | | |

### A04 – Insecure Design / Business Logic

| # | Test | Method | Pass/Fail | Severity | Issue # | Re-test |
|---|------|--------|-----------|----------|---------|---------|
| 4.1 | Cannot enroll in a course requiring KYC without passing KYC | Enroll as a non-KYC user in a `requiresKyc=true` course | | | | |
| 4.2 | Credential cannot be issued without completed course progress | Call credential issuance endpoint before 100% progress | | | | |
| 4.3 | Duplicate enrollment prevented | Enroll in the same course twice; second attempt must return 409 | | | | |
| 4.4 | Referral self-referral blocked | Use own referral code on registration | | | | |
| 4.5 | Stripe payment intent not reusable after completion | Replay a `payment_intent.succeeded` webhook | | | | |

### A05 – Security Misconfiguration

| # | Test | Method | Pass/Fail | Severity | Issue # | Re-test |
|---|------|--------|-----------|----------|---------|---------|
| 5.1 | `X-Frame-Options: DENY` present on all responses | `curl -I https://staging.brain-storm.app` | | | | |
| 5.2 | `X-Content-Type-Options: nosniff` present | Check response headers | | | | |
| 5.3 | `Content-Security-Policy` header present and restrictive | Check CSP header; verify no `unsafe-eval` in production | | | | |
| 5.4 | Swagger/OpenAPI docs disabled or auth-gated in production | `GET /api/docs` returns 404 or 401 in prod | | | | |
| 5.5 | Debug endpoints (`/api/debug`, `/metrics`) not public | Attempt access without admin credentials | | | | |
| 5.6 | Error responses do not expose stack traces | Trigger a 500; verify no stack in body | | | | |
| 5.7 | CORS allows only known origins | Send request with `Origin: https://evil.com`; verify no ACAO header | | | | |
| 5.8 | Prometheus `/metrics` behind auth or internal network only | `GET /metrics` from external IP | | | | |

### A06 – Vulnerable and Outdated Components

| # | Test | Method | Pass/Fail | Severity | Issue # | Re-test |
|---|------|--------|-----------|----------|---------|---------|
| 6.1 | No known CVEs in npm dependencies | `npm audit --audit-level=high` returns zero HIGH/CRITICAL | | | | |
| 6.2 | No known CVEs in Rust crates | `cargo audit --deny warnings` passes | | | | |
| 6.3 | Docker base images have no CRITICAL CVEs | Trivy scan in CI passes | | | | |

### A07 – Identification and Authentication Failures

| # | Test | Method | Pass/Fail | Severity | Issue # | Re-test |
|---|------|--------|-----------|----------|---------|---------|
| 7.1 | **Rate limiting** on `POST /api/auth/login` | Send 20 requests/min; 16th+ must return 429 | | | | |
| 7.2 | **Rate limiting** on `POST /api/auth/register` | Same as above | | | | |
| 7.3 | **Rate limiting** on `POST /api/auth/forgot-password` | Flood endpoint; expect 429 before 10 requests | | | | |
| 7.4 | **Rate-limit bypass via header spoofing** – `X-Forwarded-For` ignored or validated | Rotate `X-Forwarded-For` IP on each request; confirm rate limit still triggers | | | | |
| 7.5 | **Rate-limit bypass via slow requests** | Send requests just under threshold; verify cumulative counter | | | | |
| 7.6 | Expired JWT is rejected (not just structurally invalid) | Backdate `exp` claim; verify 401 | | | | |
| 7.7 | Blacklisted JWT (post-logout) is rejected | Log out, reuse old access token; must return 401 | | | | |
| 7.8 | Account lockout after N failed logins | 10 wrong-password attempts; verify locked or CAPTCHA required | | | | |
| 7.9 | Password reset tokens expire after 24 h | Reuse reset token 25 h after issue | | | | |
| 7.10 | MFA backup codes are single-use | Reuse a backup code a second time; must fail | | | | |

### A08 – Software and Data Integrity Failures

| # | Test | Method | Pass/Fail | Severity | Issue # | Re-test |
|---|------|--------|-----------|----------|---------|---------|
| 8.1 | Webhook signature (Stripe `stripe-signature`) verified before processing | Replay a Stripe webhook with invalid signature; must return 400 | | | | |
| 8.2 | Stellar transaction hash verified on-chain before credential issuance | Submit a fake `txHash`; must fail validation | | | | |
| 8.3 | Dependencies installed from lock file only (no `--legacy-peer-deps` workarounds that skip integrity) | Confirm CI uses `npm ci` | | | | |

### A09 – Security Logging and Monitoring Failures

| # | Test | Method | Pass/Fail | Severity | Issue # | Re-test |
|---|------|--------|-----------|----------|---------|---------|
| 9.1 | Failed login attempts logged with IP and timestamp | Trigger failed logins; check audit log | | | | |
| 9.2 | Successful logins and logouts logged | Login then logout; verify entries in `access_logs` | | | | |
| 9.3 | Admin privilege escalation attempts logged | Attempt forbidden admin endpoint; check `audit_logs` | | | | |
| 9.4 | PII not present in application logs | Search logs for email patterns; must not appear | | | | |
| 9.5 | Sentry error reports do not include sensitive request bodies | Trigger a 500 with auth payload; inspect Sentry event | | | | |

### A10 – Server-Side Request Forgery (SSRF)

| # | Test | Method | Pass/Fail | Severity | Issue # | Re-test |
|---|------|--------|-----------|----------|---------|---------|
| 10.1 | Avatar/image URL fields do not fetch arbitrary URLs server-side | Set avatar URL to `http://169.254.169.254/latest/meta-data/` | | | | |
| 10.2 | Webhook endpoint registration validates allowed URL schemes (https only, no localhost) | Register a webhook with `url: "http://localhost:6379"` | | | | |

### File Upload Abuse

| # | Test | Method | Pass/Fail | Severity | Issue # | Re-test |
|---|------|--------|-----------|----------|---------|---------|
| U.1 | Only allowed MIME types accepted for KYC document upload | Upload a `.exe` file as a KYC document | | | | |
| U.2 | File size limit enforced | Upload a 50 MB file; must be rejected | | | | |
| U.3 | Uploaded files are not executable (served from CDN, not app server) | Check that KYC document URLs point to a CDN/S3 origin | | | | |
| U.4 | File path traversal via filename | Upload with filename `../../etc/passwd`; verify sanitized storage path | | | | |
| U.5 | SVG files sanitized or rejected (XSS via SVG) | Upload an SVG with `<script>` tag as avatar | | | | |

---

## Severity Definitions

| Severity | Description | SLA to Fix |
|----------|-------------|------------|
| CRITICAL | Direct data breach, authentication bypass, RCE | 24 h |
| HIGH | Privilege escalation, mass IDOR, SSRF to internal services | 72 h |
| MEDIUM | Limited IDOR, stored XSS, weak rate-limit bypass | 2 weeks |
| LOW | Information disclosure, missing headers, best-practice gaps | Next sprint |

---

## Finding Log

Track findings here and link to GitHub Issues.

| Date | Tester | Item # | Finding Summary | Severity | GitHub Issue | Owner | Fixed Date | Re-test Result |
|------|--------|--------|-----------------|----------|-------------|-------|------------|----------------|
| | | | | | | | | |

---

## Re-test Protocol

After the owner marks an issue as fixed:

1. Deploy fix to staging.
2. Tester re-runs only the relevant checklist item.
3. Update **Re-test** column with `PASS` / `FAIL` and date.
4. Close the GitHub issue only after `PASS` is recorded.

---

## Tools Reference

| Tool | Purpose |
|------|---------|
| [OWASP ZAP](https://www.zaproxy.org/) | Automated baseline + active scanning (already in CI) |
| [Burp Suite Community](https://portswigger.net/burp) | Manual intercept & replay |
| `curl` / `httpie` | Quick header and auth checks |
| `npm audit` | Dependency CVE scan |
| `cargo audit` | Rust crate CVE scan |
| Trivy | Docker image CVE scan (in CI) |
| [jwt.io](https://jwt.io) | JWT decode / tamper testing |
