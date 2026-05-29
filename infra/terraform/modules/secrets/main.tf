resource "aws_secretsmanager_secret" "db_password" {
  name                    = "/${var.environment}/brain-storm/db-password"
  description             = "Brain-Storm RDS master password"
  recovery_window_in_days = var.recovery_window_days

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "/${var.environment}/brain-storm/jwt-secret"
  description             = "Brain-Storm JWT signing secret"
  recovery_window_in_days = var.recovery_window_days

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

resource "aws_secretsmanager_secret" "stellar_key" {
  name                    = "/${var.environment}/brain-storm/stellar-secret-key"
  description             = "Brain-Storm Stellar signing key"
  recovery_window_in_days = var.recovery_window_days

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "stellar_key" {
  secret_id     = aws_secretsmanager_secret.stellar_key.id
  secret_string = var.stellar_secret_key
}

# Automatic rotation for database password every 90 days
resource "aws_secretsmanager_secret_rotation" "db_password" {
  count               = var.enable_rotation ? 1 : 0
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_lambda_arn = var.rotation_lambda_arn

  rotation_rules {
    automatically_after_days = 90
  }
}

# CloudWatch log group for secret access audit trail
resource "aws_cloudwatch_log_group" "secret_access" {
  name              = "/brain-storm/${var.environment}/secret-access"
  retention_in_days = 365

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# S3 bucket for secret backups
resource "aws_s3_bucket" "secret_backup" {
  bucket = "${var.environment}-brain-storm-secret-backup-${var.account_id}"

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "secret_backup" {
  bucket = aws_s3_bucket.secret_backup.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "secret_backup" {
  bucket = aws_s3_bucket.secret_backup.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "secret_backup" {
  bucket                  = aws_s3_bucket.secret_backup.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "secret_backup" {
  bucket = aws_s3_bucket.secret_backup.id

  rule {
    id     = "expire-old-backups"
    status = "Enabled"

    expiration {
      days = var.backup_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# IAM policy for emergency access (break-glass)
resource "aws_iam_policy" "secret_emergency_access" {
  name        = "${var.environment}-brain-storm-secret-emergency-access"
  description = "Break-glass emergency read access to all Brain-Storm secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecretVersionIds",
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.stellar_key.arn,
        ]
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      },
    ]
  })

  tags = {
    Environment = var.environment
    Purpose     = "emergency-break-glass"
  }
}

# CloudTrail-based alerting for emergency policy usage
resource "aws_cloudwatch_metric_alarm" "emergency_access_used" {
  alarm_name          = "${var.environment}-brain-storm-emergency-secret-access"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "CallCount"
  namespace           = "CloudTrailMetrics"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Emergency (break-glass) secret access policy was used"
  alarm_actions       = var.alert_sns_arns

  dimensions = {
    PolicyName = aws_iam_policy.secret_emergency_access.name
  }

  tags = {
    Environment = var.environment
  }
}
