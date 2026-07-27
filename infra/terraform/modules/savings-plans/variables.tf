variable "environment" {
  description = "Environment name"
  type        = string
}

variable "db_instance_class" {
  description = "RDS instance class for reservation recommendation"
  type        = string
  default     = "db.t3.micro"
}

variable "redis_node_type" {
  description = "ElastiCache node type for reservation recommendation"
  type        = string
  default     = "cache.t3.micro"
}

variable "rds_reserved_instance_count" {
  description = "Number of RDS reserved instances to track"
  type        = number
  default     = 1
}

variable "elasticache_reserved_node_count" {
  description = "Number of ElastiCache reserved nodes to track"
  type        = number
  default     = 1
}

variable "enable_compute_savings_plan" {
  description = "Enable Compute Savings Plan"
  type        = bool
  default     = true
}

variable "compute_savings_plan_hourly_commitment" {
  description = "Compute Savings Plan hourly commitment in USD"
  type        = number
  default     = 1.0
}
