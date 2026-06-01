# Automated Compliance Checking

This document describes the automated compliance checking system for Brain-Storm.

## Overview

The compliance checking system automatically scans the codebase and infrastructure for compliance violations, generates reports, and provides dashboards for monitoring compliance status.

## Features

- **Compliance Rules**: Automated scanning for common compliance violations
- **Compliance Reports**: Detailed JSON reports of compliance status
- **Compliance Dashboards**: Interactive HTML dashboards for visualization
- **Compliance Alerts**: Notifications for compliance failures
- **Compliance Tracking**: Historical compliance metrics

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│            Automated Compliance Checking                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Codebase        │  │  Compliance      │               │
│  │  Infrastructure  │──│  Scanner         │               │
│  └──────────────────┘  └──────────────────┘               │
│           │                      │                         │
│           └──────────┬───────────┘                         │
│                      │                                     │
│           ┌──────────▼──────────┐                         │
│           │  Compliance Rules   │                         │
│           │  - Secrets          │                         │
│           │  - HTTPS            │                         │
│           │  - Dependencies      │                         │
│           │  - Error handling    │                         │
│           │  - Input validation  │                         │
│           │  - Logging           │                         │
│           │  - Authentication    │                         │
│           │  - CORS              │                         │
│           └──────────┬──────────┘                         │
│                      │                                     │
│           ┌──────────▼──────────┐                         │
│           │  Report Generation  │                         │
│           │  - JSON reports     │                         │
│           │  - HTML dashboards  │                         │
│           │  - Alerts           │                         │
│           └────────────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Run Compliance Check

```bash
# Run compliance check for dev environment
./scripts/compliance-check.sh dev

# Specify custom report file
./scripts/compliance-check.sh dev compliance-report.json
```

### Generate Dashboard

```bash
# Generate dashboard from report
./scripts/generate-compliance-dashboard.sh compliance-report.json compliance-dashboard.html

# View dashboard
open compliance-dashboard.html
```

### View Report

```bash
# Pretty print report
cat compliance-report.json | jq '.'

# Check specific rule
cat compliance-report.json | jq '.rules[] | select(.name == "no_hardcoded_secrets")'

# Get overall status
cat compliance-report.json | jq '.overall_status'
```

## Compliance Rules

### 1. No Hardcoded Secrets

Scans for hardcoded passwords, API keys, tokens, and secrets in source code.

**Patterns Checked**:
- `password = "..."`
- `api_key = "..."`
- `secret = "..."`
- `token = "..."`

**Status**: ✅ Pass if no hardcoded secrets found

**Remediation**:
```bash
# Use environment variables instead
export API_KEY="your-key"

# Or use .env files
API_KEY=your-key
```

### 2. HTTPS Enforcement

Ensures all external URLs use HTTPS encryption.

**Patterns Checked**:
- `http://` URLs (excluding localhost)
- Unencrypted connections

**Status**: ✅ Pass if all external URLs use HTTPS

**Remediation**:
```bash
# Update configuration
EXTERNAL_API_URL=https://api.example.com
```

### 3. No Vulnerable Dependencies

Checks for known vulnerabilities in npm packages.

**Tools Used**:
- `npm audit`
- Dependency scanning

**Status**: ✅ Pass if no vulnerabilities found

**Remediation**:
```bash
# Update vulnerable packages
npm audit fix

# Or manually update
npm update package-name
```

### 4. Proper Error Handling

Ensures all promises have error handlers.

**Patterns Checked**:
- `.then()` without `.catch()`
- Unhandled promise rejections

**Status**: ✅ Pass if all promises have error handlers

**Remediation**:
```typescript
// Add error handling
promise
  .then(result => console.log(result))
  .catch(error => console.error(error));

// Or use async/await
try {
  const result = await promise;
} catch (error) {
  console.error(error);
}
```

### 5. Input Validation

Ensures all user inputs are validated.

**Patterns Checked**:
- `req.body` without validation
- `req.query` without validation
- `req.params` without validation

**Status**: ✅ Pass if all inputs are validated

**Remediation**:
```typescript
// Use validation library
import { validate } from 'class-validator';

@Post()
async create(@Body() dto: CreateUserDto) {
  const errors = await validate(dto);
  if (errors.length > 0) {
    throw new BadRequestException(errors);
  }
}
```

### 6. Logging Compliance

Ensures sensitive data is not logged.

**Patterns Checked**:
- `console.log()` with sensitive data
- `logger.info()` with passwords/tokens
- Unmasked PII in logs

**Status**: ✅ Pass if no sensitive data in logs

**Remediation**:
```typescript
// Mask sensitive data
const maskedPassword = password.replace(/./g, '*');
logger.info(`User login: ${username}, password: ${maskedPassword}`);

// Or exclude sensitive fields
const { password, ...safeUser } = user;
logger.info('User created', safeUser);
```

### 7. Authentication Enforcement

Ensures all endpoints require authentication.

**Patterns Checked**:
- Endpoints without `@UseGuards`
- Endpoints without `@Auth` decorator
- Unprotected public endpoints

**Status**: ✅ Pass if all endpoints are protected

**Remediation**:
```typescript
// Add authentication guard
@UseGuards(AuthGuard('jwt'))
@Get()
async getUsers() {
  // ...
}

// Or mark as public
@Public()
@Get('public')
async getPublicData() {
  // ...
}
```

### 8. CORS Configuration

Ensures CORS is not overly permissive.

**Patterns Checked**:
- `origin: '*'`
- `Access-Control-Allow-Origin: *`
- Wildcard CORS settings

**Status**: ✅ Pass if CORS is properly configured

**Remediation**:
```typescript
// Restrict CORS to specific origins
app.enableCors({
  origin: ['https://example.com', 'https://app.example.com'],
  credentials: true,
});
```

## Report Format

Compliance reports are JSON files with the following structure:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "dev",
  "overall_status": "pass",
  "rules": [
    {
      "name": "no_hardcoded_secrets",
      "status": "pass",
      "violations": 0
    },
    {
      "name": "https_enforcement",
      "status": "pass",
      "violations": 0
    },
    {
      "name": "no_vulnerable_dependencies",
      "status": "fail",
      "violations": 3
    }
  ]
}
```

## Dashboard Features

The compliance dashboard provides:

- **Overall Status**: Pass/Fail indicator
- **Statistics**: Total rules, passed, failed, violations
- **Rule Cards**: Individual rule status and violation count
- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Reflects latest compliance status

## Scheduling

### Cron Job for Compliance Checks

```bash
# Run compliance check daily at 3 AM
0 3 * * * /workspaces/Brain-Storm/scripts/compliance-check.sh dev > /var/log/compliance-check.log 2>&1

# Generate dashboard daily at 3:30 AM
30 3 * * * /workspaces/Brain-Storm/scripts/generate-compliance-dashboard.sh compliance-report.json compliance-dashboard.html
```

### GitHub Actions Workflow

```yaml
name: Compliance Check
on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM UTC

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run compliance check
        run: ./scripts/compliance-check.sh dev
      - name: Generate dashboard
        run: ./scripts/generate-compliance-dashboard.sh compliance-report.json compliance-dashboard.html
      - name: Upload dashboard
        uses: actions/upload-artifact@v3
        with:
          name: compliance-dashboard
          path: compliance-dashboard.html
```

## Best Practices

1. **Run regularly**: Check compliance daily or on every commit
2. **Fix violations immediately**: Address compliance issues promptly
3. **Review reports**: Regularly review compliance reports
4. **Update rules**: Keep compliance rules current with standards
5. **Document exceptions**: Document any compliance exceptions
6. **Automate enforcement**: Use pre-commit hooks to enforce compliance
7. **Monitor trends**: Track compliance metrics over time

## Troubleshooting

### Compliance check fails

```bash
# Run with verbose output
bash -x ./scripts/compliance-check.sh dev

# Check specific rule
grep -r "password\s*=" --include="*.ts" --include="*.js" .
```

### Dashboard not generating

```bash
# Check report file
cat compliance-report.json | jq '.'

# Verify script permissions
chmod +x ./scripts/generate-compliance-dashboard.sh

# Run with verbose output
bash -x ./scripts/generate-compliance-dashboard.sh compliance-report.json compliance-dashboard.html
```

### False positives

```bash
# Exclude specific files
grep -r "pattern" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git .

# Update compliance rules
# Edit scripts/compliance-check.sh to adjust patterns
```

## Related Documentation

- [Security Best Practices](./security-best-practices.md)
- [Security Guidelines](./security-guidelines.md)
- [Input Sanitization](./input-sanitization.md)
- [Data Privacy & GDPR](./data-privacy-gdpr.md)
