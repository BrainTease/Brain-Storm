variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the VPC Link"
  type        = list(string)
}

variable "alb_listener_arn" {
  description = "ARN of the ALB listener to proxy traffic to"
  type        = string
}

variable "cors_allow_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "throttle_burst_limit" {
  description = "Maximum concurrent requests the API Gateway will handle"
  type        = number
  default     = 500
}

variable "throttle_rate_limit" {
  description = "Steady-state requests per second"
  type        = number
  default     = 100
}

variable "default_auth_type" {
  description = "Default route authorization type: NONE or JWT"
  type        = string
  default     = "NONE"
}

variable "jwt_audience" {
  description = "Expected JWT audience (required when default_auth_type = JWT)"
  type        = list(string)
  default     = []
}

variable "jwt_issuer" {
  description = "JWT issuer URL (required when default_auth_type = JWT)"
  type        = string
  default     = ""
}

variable "alarm_4xx_threshold" {
  description = "Number of 4xx errors per minute that triggers an alarm"
  type        = number
  default     = 100
}

variable "alarm_5xx_threshold" {
  description = "Number of 5xx errors per minute that triggers an alarm"
  type        = number
  default     = 10
}

variable "alert_sns_arns" {
  description = "SNS topic ARNs for CloudWatch alarms"
  type        = list(string)
  default     = []
}
