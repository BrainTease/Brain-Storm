# Automated Environment Provisioning

This document describes the automated environment provisioning system for Brain-Storm.

## Overview

The environment provisioning system automatically creates, monitors, and cleans up test environments using Terraform and AWS resources.

## Features

- **Infrastructure Templates**: Reusable Terraform modules for consistent environment creation
- **Automated Creation**: One-command environment provisioning
- **Monitoring**: CloudWatch metrics and alarms for resource health
- **Cost Tracking**: Automatic cost categorization and tracking
- **Cleanup**: TTL-based automatic resource cleanup

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Environment Provisioning                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Terraform       │  │  AWS Resources   │               │
│  │  Modules         │──│  (EC2, RDS, S3)  │               │
│  └──────────────────┘  └──────────────────┘               │
│           │                      │                         │
│           └──────────┬───────────┘                         │
│                      │                                     │
│           ┌──────────▼──────────┐                         │
│           │  CloudWatch        │                         │
│           │  Monitoring        │                         │
│           └──────────┬──────────┘                         │
│                      │                                     │
│           ┌──────────▼──────────┐                         │
│           │  Cleanup Script    │                         │
│           │  (TTL-based)       │                         │
│           └────────────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Provision a New Environment

```bash
# Using Terraform
cd infra/terraform
terraform apply -var-file=environments/dev.tfvars

# Or using the provisioning script
./scripts/provision-environment.sh dev
```

### Monitor Environment

```bash
# View CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-xxxxx \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 300 \
  --statistics Average
```

### Cleanup Environment

```bash
# Dry run (preview what will be deleted)
./scripts/environment-cleanup.sh dev 24 true

# Actual cleanup
./scripts/environment-cleanup.sh dev 24 false
```

## Configuration

### Environment Variables

```bash
# Terraform variables
export TF_VAR_environment="dev"
export TF_VAR_aws_region="us-east-1"
export TF_VAR_instance_type="t3.medium"
export TF_VAR_enable_monitoring="true"
export TF_VAR_enable_cost_tracking="true"
export TF_VAR_auto_cleanup_enabled="true"
export TF_VAR_cleanup_ttl_hours="24"
```

### Terraform Variables File

Create `infra/terraform/environments/dev.tfvars`:

```hcl
environment              = "dev"
aws_region              = "us-east-1"
instance_type           = "t3.medium"
enable_monitoring       = true
enable_cost_tracking    = true
auto_cleanup_enabled    = true
cleanup_ttl_hours       = 24
```

## Monitoring

### CloudWatch Alarms

The system automatically creates alarms for:

- **CPU Utilization**: Alert when > 80%
- **Disk Space**: Alert when > 85%
- **Memory Usage**: Alert when > 90%

### Cost Tracking

Resources are tagged with:

- `Environment`: Environment name
- `CostCenter`: engineering
- `CreatedAt`: Creation timestamp
- `AutoCleanup`: Cleanup eligibility

View costs:

```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=TAG
```

## Cleanup Policy

Resources are automatically cleaned up based on:

1. **TTL (Time To Live)**: Default 24 hours
2. **AutoCleanup Tag**: Must be set to `true`
3. **Environment Tag**: Must match the target environment

### Cleanup Process

1. Query resources with matching tags
2. Check creation time against TTL
3. Terminate/delete resources older than TTL
4. Log all cleanup actions

## Best Practices

1. **Always use dry-run first**: Test cleanup before executing
2. **Set appropriate TTL**: Balance between cost and availability
3. **Monitor costs**: Review CloudWatch cost metrics regularly
4. **Tag resources**: Ensure all resources have proper tags
5. **Document changes**: Keep infrastructure-as-code updated

## Troubleshooting

### Resources not cleaning up

```bash
# Check resource tags
aws ec2 describe-instances \
  --filters "Name=tag:Environment,Values=dev" \
  --query "Reservations[].Instances[].Tags"

# Check creation time
aws ec2 describe-instances \
  --instance-ids i-xxxxx \
  --query "Reservations[].Instances[].LaunchTime"
```

### Monitoring not working

```bash
# Verify CloudWatch agent
aws cloudwatch list-metrics \
  --namespace AWS/EC2 \
  --dimensions Name=InstanceId,Value=i-xxxxx

# Check alarm status
aws cloudwatch describe-alarms \
  --alarm-names brain-storm-dev-cpu
```

## Related Documentation

- [Terraform Guide](./terraform.md)
- [Deployment Guide](./deployment-guide.md)
- [Cost Optimization](./performance-optimization.md)
