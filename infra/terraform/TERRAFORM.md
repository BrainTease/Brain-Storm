# Terraform Infrastructure Guide

## Structure

```
infra/terraform/
├── bootstrap/          # One-time: create remote state S3 + DynamoDB lock table
├── modules/
│   ├── vpc/            # Networking: VPC, subnets, NAT gateways, flow logs
│   ├── rds/            # Managed PostgreSQL (AWS RDS)
│   ├── elasticache/    # Managed Redis (AWS ElastiCache)
│   ├── storage/        # S3 buckets for assets and backups
│   ├── ecs/            # ECS Fargate cluster + services
│   ├── ecr/            # Container registries
│   ├── alb/            # Application Load Balancer
│   ├── autoscaling/    # ECS service autoscaling
│   ├── api-gateway/    # HTTP API Gateway
│   ├── secrets/        # AWS Secrets Manager entries
│   └── oidc/           # GitHub Actions OIDC IAM role
├── environments/
│   ├── staging/        # Staging-specific root module
│   └── prod/           # Production-specific root module
├── main.tf             # Root module (all environments via -var environment=...)
└── variables.tf / outputs.tf / terraform.tfvars.example
```

## First-time Setup (run once per AWS account)

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -var account_id=<YOUR_AWS_ACCOUNT_ID>
```

## Apply (per environment)

```bash
# Staging
cd infra/terraform/environments/staging
terraform init \
  -backend-config="bucket=brain-storm-terraform-state-<ACCOUNT_ID>" \
  -backend-config="region=us-east-1"
terraform apply \
  -var account_id=<ACCOUNT_ID> \
  -var db_username=<USER> \
  -var db_password=<PASS> \
  -var jwt_secret=<SECRET> \
  -var stellar_secret_key=<KEY> \
  -var github_org=<ORG>

# Production
cd infra/terraform/environments/prod
terraform init \
  -backend-config="bucket=brain-storm-terraform-state-<ACCOUNT_ID>" \
  -backend-config="region=us-east-1"
terraform apply \
  -var account_id=<ACCOUNT_ID> \
  -var db_username=<USER> \
  -var db_password=<PASS> \
  -var jwt_secret=<SECRET> \
  -var stellar_secret_key=<KEY> \
  -var github_org=<ORG>
```

> **Tip:** Use `TF_VAR_db_password`, `TF_VAR_jwt_secret`, etc. to avoid secrets in shell history.

## Destroy

```bash
terraform destroy   # staging or prod directory
```

Production RDS has `deletion_protection = true` — disable it first:
```bash
terraform apply -var environment=prod \
  -target=module.rds.aws_db_instance.main \
  -var rds_deletion_protection=false
terraform destroy
```

## Remote State

State is stored in S3 (`brain-storm-terraform-state-<account_id>`) with locking
via DynamoDB (`brain-storm-terraform-locks`). All state files are encrypted at rest.

| Environment | State key |
|-------------|-----------|
| staging     | `staging/terraform.tfstate` |
| prod        | `prod/terraform.tfstate` |
