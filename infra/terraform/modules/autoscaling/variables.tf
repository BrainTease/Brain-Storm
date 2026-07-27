variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "backend_service_name" {
  description = "ECS backend service name"
  type        = string
}

variable "frontend_service_name" {
  description = "ECS frontend service name"
  type        = string
}

variable "backend_min_capacity" {
  description = "Minimum number of backend tasks"
  type        = number
  default     = 2
}

variable "backend_max_capacity" {
  description = "Maximum number of backend tasks"
  type        = number
  default     = 10
}

variable "backend_cpu_target" {
  description = "Target CPU utilization % to trigger backend scaling"
  type        = number
  default     = 70
}

variable "backend_memory_target" {
  description = "Target memory utilization % to trigger backend scaling"
  type        = number
  default     = 80
}

variable "frontend_min_capacity" {
  description = "Minimum number of frontend tasks"
  type        = number
  default     = 2
}

variable "frontend_max_capacity" {
  description = "Maximum number of frontend tasks"
  type        = number
  default     = 6
}

variable "frontend_cpu_target" {
  description = "Target CPU utilization % to trigger frontend scaling"
  type        = number
  default     = 70
}

variable "frontend_memory_target" {
  description = "Target memory utilization % to trigger frontend scaling"
  type        = number
  default     = 80
}
