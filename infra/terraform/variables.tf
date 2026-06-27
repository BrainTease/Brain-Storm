variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "account_id" {
  description = "AWS account ID"
  type        = string
}

# ─── Networking ───────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_flow_logs" {
  description = "Enable VPC flow logs to CloudWatch"
  type        = bool
  default     = true
}

# ─── Database ─────────────────────────────────────────────────────────────────

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "brainstorm"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ RDS for high availability (recommended for prod)"
  type        = bool
  default     = false
}

variable "rds_monitoring_interval" {
  description = "Enhanced RDS monitoring interval in seconds (0 to disable)"
  type        = number
  default     = 60
}

# ─── Redis ────────────────────────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

# ─── ECR ──────────────────────────────────────────────────────────────────────

variable "ecr_image_retention_count" {
  description = "Number of tagged images to retain per ECR repository"
  type        = number
  default     = 10
}

# ─── ECS / Application ────────────────────────────────────────────────────────

variable "backend_image" {
  description = "Docker image URI for backend service. Defaults to ECR repo when empty."
  type        = string
  default     = ""
}

variable "frontend_image" {
  description = "Docker image URI for frontend service. Defaults to ECR repo when empty."
  type        = string
  default     = ""
}

variable "api_base_url" {
  description = "Public API base URL injected as NEXT_PUBLIC_API_URL into the frontend container"
  type        = string
  default     = ""
}

variable "ecs_backend_desired_count" {
  description = "Initial desired count for the backend ECS service"
  type        = number
  default     = 2
}

variable "ecs_frontend_desired_count" {
  description = "Initial desired count for the frontend ECS service"
  type        = number
  default     = 2
}

# ─── Auto Scaling ─────────────────────────────────────────────────────────────

variable "backend_min_capacity" {
  description = "Minimum number of backend ECS tasks"
  type        = number
  default     = 2
}

variable "backend_max_capacity" {
  description = "Maximum number of backend ECS tasks"
  type        = number
  default     = 10
}

variable "frontend_min_capacity" {
  description = "Minimum number of frontend ECS tasks"
  type        = number
  default     = 2
}

variable "frontend_max_capacity" {
  description = "Maximum number of frontend ECS tasks"
  type        = number
  default     = 6
}

# ─── ALB / HTTPS ──────────────────────────────────────────────────────────────

variable "https_certificate_arn" {
  description = "ACM certificate ARN for HTTPS. HTTP redirects to HTTPS when set."
  type        = string
  default     = ""
}

# ─── GitHub OIDC ──────────────────────────────────────────────────────────────

variable "github_org" {
  description = "GitHub organization or username owning this repo"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "Brain-Storm"
}

# ─── Secrets ──────────────────────────────────────────────────────────────────

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "stellar_secret_key" {
  description = "Stellar signing key"
  type        = string
  sensitive   = true
}

# ─── Observability / Alerting ─────────────────────────────────────────────────

variable "alert_sns_arns" {
  description = "SNS topic ARNs for CloudWatch alarms and security alerts"
  type        = list(string)
  default     = []
}

variable "api_gateway_cors_origins" {
  description = "Allowed CORS origins for the API Gateway"
  type        = list(string)
  default     = ["*"]
}

# ─── Cost Optimization ────────────────────────────────────────────────────────

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD for cost alerts"
  type        = number
  default     = 5000
}

variable "cost_alert_email" {
  description = "Email address for cost optimization alerts"
  type        = string
  sensitive   = true
}

variable "rds_reserved_instance_count" {
  description = "Number of RDS reserved instances to track for cost optimization"
  type        = number
  default     = 1
}

variable "elasticache_reserved_node_count" {
  description = "Number of ElastiCache reserved nodes to track for cost optimization"
  type        = number
  default     = 1
}

variable "enable_compute_savings_plan" {
  description = "Enable Compute Savings Plan tracking and recommendations"
  type        = bool
  default     = true
}

variable "compute_savings_plan_hourly_commitment" {
  description = "Compute Savings Plan hourly commitment in USD for cost estimation"
  type        = number
  default     = 1.0
}
