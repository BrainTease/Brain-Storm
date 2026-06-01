# Automated Infrastructure Validation Guide

This document describes the automated infrastructure validation system for Brain-Storm, including Terraform validation, security policy checking, infrastructure testing, and versioning.

## Overview

The automated infrastructure validation system provides:
- **Terraform Validation**: Syntax and configuration validation
- **Security Policy Checking**: OPA-based policy enforcement
- **Infrastructure Testing**: Health checks and functionality tests
- **Infrastructure Versioning**: Version tracking and change history
- **CI/CD Integration**: Automated validation on every infrastructure change

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              GitHub Actions Workflow                     │
│         (On Terraform file changes)                      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│ Terraform Format │    │ Terraform Lint   │
│ & Validation     │    │ (TFLint)         │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Security Scanning     │
        │  - Checkov             │
        │  - OPA Policies        │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  Terraform Plan        │
        │  Analysis              │
        └────────┬───────────────┘
                 │
        ┌────────┴────────┬──────────────┐
        ▼                 ▼              ▼
    ┌────────┐      ┌──────────┐   ┌────────┐
    │ Approve│      │ Reject   │   │ Review │
    │ Deploy │      │ Changes  │   │ Manual │
    └────────┘      └──────────┘   └────────┘
```

## Validation Components

### 1. Terraform Format Check

**Purpose**: Ensures consistent code formatting

**Command**:
```bash
terraform fmt -check -recursive
```

**What it checks**:
- Consistent indentation (2 spaces)
- Proper bracket alignment
- Consistent naming conventions

**Failure handling**: Blocks deployment

### 2. Terraform Validation

**Purpose**: Validates Terraform configuration syntax and structure

**Command**:
```bash
terraform validate
```

**What it checks**:
- Valid HCL syntax
- Required provider configuration
- Variable and output definitions
- Module references

**Failure handling**: Blocks deployment

### 3. TFLint

**Purpose**: Checks for best practices and potential issues

**Configuration**: `scripts/.tflint.hcl`

**What it checks**:
- Naming conventions
- Deprecated syntax
- Module pinning
- AWS-specific best practices
- Security group rules
- Encryption settings

**Failure handling**: Warns but allows deployment

### 4. Checkov

**Purpose**: Security and compliance scanning

**What it checks**:
- Encryption at rest and in transit
- Public access restrictions
- Backup and recovery settings
- Logging and monitoring
- IAM policies
- Network security

**Failure handling**: Warns but allows deployment

### 5. OPA Policies

**Purpose**: Custom policy enforcement

**File**: `infra/terraform/policies/terraform.rego`

**Policies**:
- Deny unrestricted security group access
- Require RDS encryption
- Require S3 versioning
- Require backup retention
- Require Multi-AZ for high availability
- Require proper tagging

**Failure handling**: Blocks deployment

### 6. Terraform Plan Analysis

**Purpose**: Analyzes infrastructure changes

**What it checks**:
- Resource creation/modification/deletion
- Cost estimation
- Dependency analysis
- Breaking changes

**Output**: Detailed plan report

## Running Validation

### Local Validation

```bash
# Run all validation checks
./scripts/validate-infrastructure.sh

# Run specific checks
terraform fmt -check -recursive
terraform validate
tflint
checkov -d infra/terraform --framework terraform
```

### Automated Validation

Validation runs automatically via GitHub Actions:

**Trigger**: Push to `main` or PR with changes to `infra/terraform/`

**Steps**:
1. Terraform format check
2. Terraform validation
3. TFLint analysis
4. Checkov security scan
5. OPA policy validation
6. Terraform plan generation
7. Cost estimation
8. PR comment with results

## Infrastructure Testing

### Test Categories

#### 1. API Health Checks
- Health endpoint (`/health`)
- Readiness probe (`/ready`)
- Liveness probe (`/live`)

#### 2. Database Connectivity
- PostgreSQL connection
- Migration status
- Query performance

#### 3. Cache Connectivity
- Redis connection
- Memory usage
- Key operations

#### 4. API Endpoints
- Course listing
- Health status
- Documentation

#### 5. Security Headers
- X-Content-Type-Options
- X-Frame-Options
- Content-Security-Policy

#### 6. Performance Checks
- API response time
- Database query performance
- Throughput metrics

#### 7. Infrastructure Resources
- RDS instance status
- ElastiCache status
- ECS services running

#### 8. Backup Verification
- Automated backups enabled
- Recent backup existence
- Backup retention policy

#### 9. Logging and Monitoring
- CloudWatch logs enabled
- CloudWatch alarms configured
- Log retention settings

#### 10. SSL/TLS Configuration
- Certificate validity
- TLS version
- Cipher strength

### Running Tests

```bash
# Run all infrastructure tests
./scripts/test-infrastructure.sh

# Run with custom environment
ENVIRONMENT=production API_URL=https://api.example.com ./scripts/test-infrastructure.sh

# Run with custom database
DB_HOST=prod-db.example.com DB_PORT=5432 ./scripts/test-infrastructure.sh
```

### Test Output

```
🧪 Starting Infrastructure Testing
==================================

1️⃣  API Health Checks
-------------------
Testing: API Health Endpoint... ✅ PASS
Testing: API Readiness... ✅ PASS
Testing: API Liveness... ✅ PASS

2️⃣  Database Connectivity
------------------------
Testing: PostgreSQL Connection... ✅ PASS
Testing: Database Migrations... ✅ PASS

...

📊 Test Summary
===============
Passed: 28
Failed: 0
Total:  28
Success Rate: 100%
```

## Infrastructure Versioning

### Purpose

Tracks infrastructure versions and changes over time for:
- Audit trail
- Rollback capability
- Change tracking
- Compliance reporting

### Version Tracking

**Tracked Components**:
- Terraform version
- AWS provider version
- Module versions
- Git commit hash
- Git branch
- Deployment timestamp

### Running Versioning

```bash
# Create version snapshot
./scripts/version-infrastructure.sh

# View version history
cat infra/terraform/.versions/VERSIONS.md

# View specific snapshot
cat infra/terraform/.versions/versions-20260601-103000.json | jq '.'
```

### Version Snapshot Example

```json
{
  "timestamp": "2026-06-01T10:30:00Z",
  "git_commit": "abc1234def5678",
  "git_branch": "main",
  "terraform_version": "v1.7.0",
  "aws_provider_version": "~> 5.0",
  "environment": "production",
  "region": "us-east-1"
}
```

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/terraform.yml`

**Triggers**:
- Push to `main` with Terraform changes
- Pull request with Terraform changes

**Steps**:
1. Checkout code
2. Configure AWS credentials
3. Setup Terraform
4. Format check
5. Terraform init
6. Terraform validate
7. TFLint analysis
8. Checkov scanning
9. OPA policy validation
10. Terraform plan
11. Cost estimation
12. PR comment with results
13. Terraform apply (on main push only)

### Deployment Workflow

```
PR Created
    ↓
Validation Runs
    ├─ Format Check
    ├─ Terraform Validate
    ├─ TFLint
    ├─ Checkov
    └─ OPA Policies
    ↓
Results Commented on PR
    ↓
Manual Review & Approval
    ↓
Merge to Main
    ↓
Terraform Apply
    ↓
Infrastructure Tests
    ↓
Version Snapshot
    ↓
Deployment Complete
```

## Policy Examples

### Security Policy: Deny Unrestricted Access

```rego
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_security_group"
    rule := resource.change.after.ingress[_]
    rule.from_port == 0
    rule.to_port == 65535
    rule.cidr_blocks[_] == "0.0.0.0/0"
    msg := sprintf("Security group %s allows unrestricted access", [resource.address])
}
```

### Encryption Policy: Require RDS Encryption

```rego
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_rds_cluster"
    resource.change.after.storage_encrypted == false
    msg := sprintf("RDS cluster %s must have encryption enabled", [resource.address])
}
```

### Tagging Policy: Require Environment Tag

```rego
deny[msg] {
    resource := input.resource_changes[_]
    resource.type in ["aws_rds_cluster", "aws_s3_bucket"]
    not resource.change.after.tags.Environment
    msg := sprintf("Resource %s must have Environment tag", [resource.address])
}
```

## Troubleshooting

### Terraform Format Issues

**Problem**: Format check fails

**Solution**:
```bash
# Auto-fix formatting
terraform fmt -recursive infra/terraform
```

### TFLint Warnings

**Problem**: TFLint reports issues

**Solution**:
```bash
# View detailed TFLint output
tflint -f json infra/terraform | jq '.'

# Disable specific rule
# Add to .tflint.hcl:
# rule "aws_instance_default_security_group" {
#   enabled = false
# }
```

### OPA Policy Violations

**Problem**: OPA policies block deployment

**Solution**:
1. Review policy violation message
2. Fix infrastructure code
3. Re-run validation
4. If policy is incorrect, update `terraform.rego`

### Checkov Failures

**Problem**: Checkov reports security issues

**Solution**:
```bash
# View detailed Checkov output
checkov -d infra/terraform --framework terraform --output cli

# Skip specific check (if acceptable)
# Add to Terraform resource:
# checkov:skip=CKV_AWS_123:Reason for skipping
```

## Best Practices

1. **Always validate locally** before pushing
2. **Review Terraform plans** carefully
3. **Keep policies updated** with security requirements
4. **Test infrastructure changes** in staging first
5. **Document policy exceptions** with justification
6. **Monitor validation results** in CI/CD
7. **Update baselines** when intentional changes are made
8. **Maintain version history** for audit trail

## References

- [Terraform Documentation](https://www.terraform.io/docs)
- [TFLint Documentation](https://github.com/terraform-linters/tflint)
- [Checkov Documentation](https://www.checkov.io/)
- [OPA/Rego Documentation](https://www.openpolicyagent.org/docs/latest/)
- [AWS Terraform Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
