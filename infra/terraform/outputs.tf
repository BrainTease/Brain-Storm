output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone ID (use for Route 53 alias records)"
  value       = module.alb.alb_zone_id
}

output "db_endpoint" {
  description = "RDS database endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.redis_endpoint
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "backend_repository_url" {
  description = "ECR repository URL for backend — use as backend_image in CI/CD"
  value       = module.ecr.backend_repository_url
}

output "frontend_repository_url" {
  description = "ECR repository URL for frontend — use as frontend_image in CI/CD"
  value       = module.ecr.frontend_repository_url
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC — set as AWS_ROLE_ARN secret"
  value       = module.oidc.role_arn
}

output "api_gateway_endpoint" {
  description = "API Gateway invoke URL"
  value       = module.api_gateway.api_gateway_endpoint
}

output "db_password_secret_arn" {
  description = "Secrets Manager ARN for the database password"
  value       = module.secrets.db_password_secret_arn
  sensitive   = true
}

output "jwt_secret_arn" {
  description = "Secrets Manager ARN for the JWT signing secret"
  value       = module.secrets.jwt_secret_arn
  sensitive   = true
}

output "assets_bucket_name" {
  description = "S3 bucket for user-uploaded assets and CDN content"
  value       = module.storage.assets_bucket_name
}

output "backups_bucket_name" {
  description = "S3 bucket for database and application backups"
  value       = module.storage.backups_bucket_name
}

output "assets_bucket_name" {
  description = "S3 bucket for user-uploaded assets and CDN content"
  value       = module.storage.assets_bucket_name
}

output "backups_bucket_name" {
  description = "S3 bucket for database and application backups"
  value       = module.storage.backups_bucket_name
}
