# Brain Storm - Terraform Infrastructure

This directory contains Terraform configurations for deploying Brain Storm to AWS using infrastructure as code.

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                       AWS Account                        │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │                  VPC (10.0.0.0/16)               │    │
│  │                                                   │    │
│  │  Public Subnets (AZ-a, AZ-b)                    │    │
│  │  ┌────────────────────────────────────────────┐ │    │
│  │  │         Application Load Balancer           │ │    │
│  │  │  :80 (HTTP) → redirect or forward           │ │    │
│  │  │  :443 (HTTPS, optional ACM cert)            │ │    │
│  │  │  path /api/* → backend target group         │ │    │
│  │  │  default    → frontend target group         │ │    │
│  │  └────────────────────────────────────────────┘ │    │
│  │                                                   │    │
│  │  Private Subnets (AZ-a, AZ-b)                   │    │
│  │  ┌──────────────┐  ┌──────────────┐             │    │
│  │  │ ECS Frontend │  │  ECS Backend │             │    │
│  │  │ (Fargate)    │  │  (Fargate)   │             │    │
│  │  │ Auto-scaling │  │  Auto-scaling│             │    │
│  │  └──────────────┘  └──────┬───────┘             │    │
│  │                           │                      │    │
│  │  ┌──────────────┐  ┌──────▼───────┐             │    │
│  │  │  ElastiCache │  │  RDS         │             │    │
│  │  │  Redis 7.1   │  │  PostgreSQL  │             │    │
│  │  │  (encrypted) │  │  16.3        │             │    │
│  │  └──────────────┘  └──────────────┘             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ECR repositories (backend + frontend)                   │
│  Secrets Manager (DB pwd, JWT, Stellar key)              │
│  API Gateway (HTTP API + VPC Link)                       │
│  GitHub Actions OIDC role                                │
└─────────────────────────────────────────────────────────┘
```

## Modules

| Module | Purpose |
|--------|---------|
| `vpc` | VPC, subnets, NAT gateways, route tables, flow logs |
| `rds` | PostgreSQL 16 with enhanced monitoring, encrypted storage |
| `elasticache` | Redis 7.1 replication group with encryption |
| `ecs` | Fargate cluster, backend & frontend services, IAM roles |
| `alb` | Internet-facing ALB, path routing, optional HTTPS |
| `ecr` | Container registries with lifecycle policies |
| `autoscaling` | CPU/memory-based auto-scaling for ECS services |
| `api-gateway` | HTTP API Gateway with VPC Link and throttling |
| `oidc` | GitHub Actions keyless authentication |
| `secrets` | Secrets Manager for DB password, JWT, Stellar key |

## Prerequisites

- Terraform >= 1.5
- AWS CLI configured with appropriate credentials
- S3 bucket for remote state: `brain-storm-terraform-state`
- DynamoDB table for state locking: `brain-storm-terraform-locks`

## Bootstrap Remote State

Run once before the first `terraform init`:

```bash
# Create S3 bucket with versioning and encryption
aws s3api create-bucket \
  --bucket brain-storm-terraform-state \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket brain-storm-terraform-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket brain-storm-terraform-state \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name brain-storm-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Usage

```bash
# 1. Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — never commit this file

# 2. Provide sensitive values as environment variables (preferred)
export TF_VAR_db_password="$(openssl rand -hex 16)"
export TF_VAR_jwt_secret="$(openssl rand -hex 32)"
export TF_VAR_stellar_secret_key="your-stellar-key"

# 3. Initialize
terraform init

# 4. Plan
terraform plan -out=tfplan

# 5. Apply
terraform apply tfplan
```

## Outputs

| Output | Description |
|--------|-------------|
| `alb_dns_name` | ALB DNS name — point your domain here |
| `api_gateway_endpoint` | API Gateway URL — use as `api_base_url` in tfvars |
| `backend_repository_url` | ECR URL for backend images |
| `frontend_repository_url` | ECR URL for frontend images |
| `github_actions_role_arn` | Set as `AWS_ROLE_ARN` GitHub secret |
| `db_endpoint` | RDS endpoint (sensitive) |
| `redis_endpoint` | ElastiCache endpoint (sensitive) |

## Two-step bootstrap

On first apply, `backend_image` and `frontend_image` default to the ECR repos.
The ECR repos will be empty, so the ECS task definitions reference images that
don't exist yet. To bootstrap:

1. Run `terraform apply` — ECR repos, VPC, RDS, and Redis are created.
2. Build and push your images:
   ```bash
   aws ecr get-login-password | docker login --username AWS \
     --password-stdin $(terraform output -raw backend_repository_url | cut -d/ -f1)
   docker build -t $(terraform output -raw backend_repository_url):latest apps/backend
   docker push $(terraform output -raw backend_repository_url):latest
   # repeat for frontend
   ```
3. Run `terraform apply` again — ECS services will start with the new images.

## HTTPS Setup

To enable HTTPS:

1. Request an ACM certificate in the same region as your ALB.
2. Set `https_certificate_arn` in `terraform.tfvars`.
3. Run `terraform apply` — the ALB will add an HTTPS listener and redirect HTTP.

## GitHub Actions OIDC

After `terraform apply`, add the `github_actions_role_arn` output as the `AWS_ROLE_ARN`
secret in your GitHub repository. Remove any existing `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY` secrets — the OIDC role replaces them.

## Cost Optimization

For dev/staging, adjust in `terraform.tfvars`:

```hcl
db_instance_class  = "db.t3.micro"
rds_multi_az       = false
redis_node_type    = "cache.t3.micro"
backend_min_capacity  = 1
frontend_min_capacity = 1
```
