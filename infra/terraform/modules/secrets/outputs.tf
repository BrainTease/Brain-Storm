output "db_password_secret_arn" {
  description = "ARN of the DB password secret"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "jwt_secret_arn" {
  description = "ARN of the JWT signing secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "stellar_key_secret_arn" {
  description = "ARN of the Stellar signing key secret"
  value       = aws_secretsmanager_secret.stellar_key.arn
}

output "secret_backup_bucket" {
  description = "Name of the S3 bucket used for secret backups"
  value       = aws_s3_bucket.secret_backup.bucket
}

output "secret_access_log_group" {
  description = "CloudWatch log group for secret access audit trail"
  value       = aws_cloudwatch_log_group.secret_access.name
}

output "emergency_access_policy_arn" {
  description = "ARN of the break-glass emergency access IAM policy"
  value       = aws_iam_policy.secret_emergency_access.arn
}
