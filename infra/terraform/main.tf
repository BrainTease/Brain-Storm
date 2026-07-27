terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "brain-storm-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "brain-storm-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Brain-Storm"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}

# ─── Networking ───────────────────────────────────────────────────────────────

module "vpc" {
  source = "./modules/vpc"

  environment      = var.environment
  vpc_cidr         = var.vpc_cidr
  enable_flow_logs = var.enable_flow_logs
}

# ─── Container Registry ───────────────────────────────────────────────────────

module "ecr" {
  source = "./modules/ecr"

  environment             = var.environment
  image_retention_count   = var.ecr_image_retention_count
  github_actions_role_arn = module.oidc.role_arn
}

# ─── Data Stores ──────────────────────────────────────────────────────────────

module "rds" {
  source = "./modules/rds"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = module.vpc.vpc_cidr
  private_subnet_ids = module.vpc.private_subnet_ids
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  db_instance_class  = var.db_instance_class
  multi_az           = var.rds_multi_az
  monitoring_interval = var.rds_monitoring_interval
}

module "elasticache" {
  source = "./modules/elasticache"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = module.vpc.vpc_cidr
  private_subnet_ids = module.vpc.private_subnet_ids
  node_type          = var.redis_node_type
}

# ─── Application Layer ────────────────────────────────────────────────────────

module "ecs" {
  source = "./modules/ecs"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = module.vpc.vpc_cidr
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  backend_image  = var.backend_image != "" ? var.backend_image : "${module.ecr.backend_repository_url}:latest"
  frontend_image = var.frontend_image != "" ? var.frontend_image : "${module.ecr.frontend_repository_url}:latest"

  db_host      = module.rds.db_endpoint
  db_name      = var.db_name
  db_username  = var.db_username
  redis_host   = module.elasticache.redis_endpoint
  api_base_url = var.api_base_url

  backend_secrets = [
    {
      name      = "DATABASE_PASSWORD"
      valueFrom = module.secrets.db_password_secret_arn
    },
    {
      name      = "JWT_SECRET"
      valueFrom = module.secrets.jwt_secret_arn
    },
    {
      name      = "STELLAR_SECRET_KEY"
      valueFrom = module.secrets.stellar_key_secret_arn
    }
  ]

  backend_desired_count  = var.ecs_backend_desired_count
  frontend_desired_count = var.ecs_frontend_desired_count
}

module "alb" {
  source = "./modules/alb"

  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  account_id        = var.account_id

  backend_target_group_arn  = module.ecs.backend_target_group_arn
  frontend_target_group_arn = module.ecs.frontend_target_group_arn

  https_certificate_arn = var.https_certificate_arn
}

# ─── Auto Scaling ─────────────────────────────────────────────────────────────

module "autoscaling" {
  source = "./modules/autoscaling"

  environment = var.environment
  cluster_name = module.ecs.cluster_name

  backend_service_name  = module.ecs.backend_service_name
  frontend_service_name = module.ecs.frontend_service_name

  backend_min_capacity  = var.backend_min_capacity
  backend_max_capacity  = var.backend_max_capacity
  frontend_min_capacity = var.frontend_min_capacity
  frontend_max_capacity = var.frontend_max_capacity
}

# ─── Edge / API Gateway ───────────────────────────────────────────────────────

module "api_gateway" {
  source = "./modules/api-gateway"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  alb_listener_arn   = module.alb.http_listener_arn
  cors_allow_origins = var.api_gateway_cors_origins
  alert_sns_arns     = var.alert_sns_arns
}

# ─── IAM / OIDC ───────────────────────────────────────────────────────────────

module "oidc" {
  source = "./modules/oidc"

  github_org  = var.github_org
  github_repo = var.github_repo
}

# ─── Secrets Management ───────────────────────────────────────────────────────

module "secrets" {
  source = "./modules/secrets"

  environment        = var.environment
  aws_region         = var.aws_region
  account_id         = var.account_id
  db_password        = var.db_password
  jwt_secret         = var.jwt_secret
  stellar_secret_key = var.stellar_secret_key
  enable_rotation    = var.environment == "prod"
  alert_sns_arns     = var.alert_sns_arns
}

# ─── Object Storage ───────────────────────────────────────────────────────────

module "storage" {
  source                = "./modules/storage"
  environment           = var.environment
  account_id            = var.account_id
  cors_allowed_origins  = var.api_gateway_cors_origins
  backup_retention_days = var.environment == "prod" ? 30 : 7
}

# ─── Cost Analysis & Optimization ─────────────────────────────────────────────

module "cost_analysis" {
  source = "./modules/cost-analysis"

  environment             = var.environment
  monthly_budget_limit    = var.monthly_budget_limit
  cost_alert_email        = var.cost_alert_email
}

# ─── Reserved Instances & Savings Plans ────────────────────────────────────────

module "savings_plans" {
  source = "./modules/savings-plans"

  environment                           = var.environment
  db_instance_class                     = var.db_instance_class
  redis_node_type                       = var.redis_node_type
  rds_reserved_instance_count           = var.rds_reserved_instance_count
  elasticache_reserved_node_count       = var.elasticache_reserved_node_count
  enable_compute_savings_plan           = var.enable_compute_savings_plan
  compute_savings_plan_hourly_commitment = var.compute_savings_plan_hourly_commitment
}
