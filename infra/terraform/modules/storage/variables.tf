variable "environment" {
  description = "Environment name"
  type        = string
}

variable "account_id" {
  description = "AWS account ID (used to make bucket names globally unique)"
  type        = string
}

variable "cors_allowed_origins" {
  description = "Origins allowed to make cross-origin requests to the assets bucket"
  type        = list(string)
  default     = ["*"]
}

variable "backup_retention_days" {
  description = "Number of days to retain backups in S3"
  type        = number
  default     = 30
}
