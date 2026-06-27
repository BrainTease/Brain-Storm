variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block for security group ingress"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "backend_image" {
  description = "Backend Docker image URI"
  type        = string
}

variable "frontend_image" {
  description = "Frontend Docker image URI"
  type        = string
}

variable "db_host" {
  description = "Database host endpoint"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "brainstorm"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "redis_host" {
  description = "Redis host endpoint"
  type        = string
}

variable "api_base_url" {
  description = "Public API base URL for the frontend (NEXT_PUBLIC_API_URL)"
  type        = string
  default     = ""
}

variable "backend_secrets" {
  description = "Secrets to inject into the backend container from Secrets Manager"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "backend_cpu" {
  description = "CPU units for backend Fargate task (256, 512, 1024, 2048, 4096)"
  type        = string
  default     = "512"
}

variable "backend_memory" {
  description = "Memory (MiB) for backend Fargate task"
  type        = string
  default     = "1024"
}

variable "frontend_cpu" {
  description = "CPU units for frontend Fargate task"
  type        = string
  default     = "256"
}

variable "frontend_memory" {
  description = "Memory (MiB) for frontend Fargate task"
  type        = string
  default     = "512"
}

variable "backend_desired_count" {
  description = "Desired number of backend task replicas"
  type        = number
  default     = 2
}

variable "frontend_desired_count" {
  description = "Desired number of frontend task replicas"
  type        = number
  default     = 2
}
