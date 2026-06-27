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
    key            = "staging/terraform.tfstate"
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
      Environment = "staging"
    }
  }
}

# Re-use root modules — staging-specific variable overrides in terraform.tfvars
module "vpc" {
  source           = "../../modules/vpc"
  environment      = "staging"
  vpc_cidr         = var.vpc_cidr
  enable_flow_logs = false
}

module "rds" {
  source             = "../../modules/rds"
  environment        = "staging"
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = module.vpc.vpc_cidr
  private_subnet_ids = module.vpc.private_subnet_ids
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  db_instance_class  = "db.t3.micro"
  multi_az           = false
  monitoring_interval = 0
}

module "elasticache" {
  source             = "../../modules/elasticache"
  environment        = "staging"
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = module.vpc.vpc_cidr
  private_subnet_ids = module.vpc.private_subnet_ids
  node_type          = "cache.t3.micro"
}

module "storage" {
  source                = "../../modules/storage"
  environment           = "staging"
  account_id            = var.account_id
  cors_allowed_origins  = ["https://staging.brain-storm.example.com"]
  backup_retention_days = 7
}

module "ecr" {
  source                  = "../../modules/ecr"
  environment             = "staging"
  image_retention_count   = 5
  github_actions_role_arn = module.oidc.role_arn
}

module "oidc" {
  source      = "../../modules/oidc"
  github_org  = var.github_org
  github_repo = var.github_repo
}

module "secrets" {
  source             = "../../modules/secrets"
  environment        = "staging"
  aws_region         = var.aws_region
  account_id         = var.account_id
  db_password        = var.db_password
  jwt_secret         = var.jwt_secret
  stellar_secret_key = var.stellar_secret_key
  enable_rotation    = false
  alert_sns_arns     = []
}
