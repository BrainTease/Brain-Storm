variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "account_id" {
  description = "AWS account ID (used for bucket naming)"
  type        = string
}

variable "db_password" {
  description = "RDS master password to store in Secrets Manager"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret to store in Secrets Manager"
  type        = string
  sensitive   = true
}

variable "stellar_secret_key" {
  description = "Stellar signing key to store in Secrets Manager"
  type        = string
  sensitive   = true
}

variable "recovery_window_days" {
  description = "Days before a deleted secret is permanently removed"
  type        = number
  default     = 30
}

variable "enable_rotation" {
  description = "Enable automatic secret rotation via Lambda"
  type        = bool
  default     = false
}

variable "rotation_lambda_arn" {
  description = "ARN of the Lambda function used for automatic secret rotation"
  type        = string
  default     = ""
}

variable "backup_retention_days" {
  description = "Days to retain secret backup objects in S3"
  type        = number
  default     = 365
}

variable "alert_sns_arns" {
  description = "SNS topic ARNs to notify when emergency access is used"
  type        = list(string)
  default     = []
}
