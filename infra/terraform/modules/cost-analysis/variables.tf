variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 5000
}

variable "cost_alert_email" {
  description = "Email for cost alerts"
  type        = string
  sensitive   = true
}
