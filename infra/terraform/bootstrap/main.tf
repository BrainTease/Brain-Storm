# Bootstrap — run ONCE per AWS account to create the remote state backend.
# Apply with: terraform -chdir=infra/terraform/bootstrap apply
#
# After apply, reference the bucket/table in each environment's backend block:
#   terraform {
#     backend "s3" {
#       bucket         = "brain-storm-terraform-state-<account_id>"
#       key            = "<env>/terraform.tfstate"
#       region         = "us-east-1"
#       encrypt        = true
#       dynamodb_table = "brain-storm-terraform-locks"
#     }
#   }

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "account_id" {
  type        = string
  description = "AWS account ID — appended to bucket name for global uniqueness"
}

# ─── S3 bucket for Terraform state ───────────────────────────────────────────

resource "aws_s3_bucket" "state" {
  bucket        = "brain-storm-terraform-state-${var.account_id}"
  force_destroy = false

  tags = {
    Name      = "brain-storm-terraform-state"
    ManagedBy = "terraform-bootstrap"
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── DynamoDB table for state locking ─────────────────────────────────────────

resource "aws_dynamodb_table" "locks" {
  name         = "brain-storm-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name      = "brain-storm-terraform-locks"
    ManagedBy = "terraform-bootstrap"
  }
}

output "state_bucket" {
  value = aws_s3_bucket.state.id
}

output "lock_table" {
  value = aws_dynamodb_table.locks.name
}
