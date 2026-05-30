variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "backend_target_group_arn" {
  description = "Backend target group ARN"
  type        = string
}

variable "frontend_target_group_arn" {
  description = "Frontend target group ARN"
  type        = string
}

variable "https_certificate_arn" {
  description = "ACM certificate ARN for HTTPS. When set, HTTP redirects to HTTPS."
  type        = string
  default     = ""
}

variable "account_id" {
  description = "AWS account ID (used for ALB access log bucket naming)"
  type        = string
}
