variable "environment" {
  description = "Environment name"
  type        = string
}

variable "image_retention_count" {
  description = "Number of tagged images to retain per repository"
  type        = number
  default     = 10
}

variable "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions (granted push access to ECR)"
  type        = string
  default     = ""
}
