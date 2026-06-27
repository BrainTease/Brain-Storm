terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "brain-storm-terraform-state"   # override with account_id suffix
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
      Environment = "prod"
    }
  }
}

module "vpc" {
  source           = "../../modules/vpc"
  environment      = "prod"
  vpc_cidr         = var.vpc_cidr
  enable_flow_logs = true
}

module "rds" {
  source              = "../../modules/rds"
  environment         = "prod"
  vpc_id              = module.vpc.vpc_id
  vpc_cidr            = module.vpc.vpc_cidr
  private_subnet_ids  = module.vpc.private_subnet_ids
  db_name             = var.db_name
  db_username         = var.db_username
  db_password         = var.db_password
  db_instance_class   = var.db_instance_class
  multi_az            = true
  monitoring_interval = 60
}

module "elasticache" {
  source             = "../../modules/elasticache"
  environment        = "prod"
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = module.vpc.vpc_cidr
  private_subnet_ids = module.vpc.private_subnet_ids
  node_type          = var.redis_node_type
}

module "storage" {
  source                = "../../modules/storage"
  environment           = "prod"
  account_id            = var.account_id
  cors_allowed_origins  = var.cors_allowed_origins
  backup_retention_days = 30
}

module "ecr" {
  source                  = "../../modules/ecr"
  environment             = "prod"
  image_retention_count   = 10
  github_actions_role_arn = module.oidc.role_arn
}

module "oidc" {
  source      = "../../modules/oidc"
  github_org  = var.github_org
  github_repo = var.github_repo
}

module "secrets" {
  source             = "../../modules/secrets"
  environment        = "prod"
  aws_region         = var.aws_region
  account_id         = var.account_id
  db_password        = var.db_password
  jwt_secret         = var.jwt_secret
  stellar_secret_key = var.stellar_secret_key
  enable_rotation    = true
  alert_sns_arns     = var.alert_sns_arns
}
