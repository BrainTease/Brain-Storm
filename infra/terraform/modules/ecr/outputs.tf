output "backend_repository_url" {
  description = "ECR repository URL for the backend image"
  value       = aws_ecr_repository.main["backend"].repository_url
}

output "frontend_repository_url" {
  description = "ECR repository URL for the frontend image"
  value       = aws_ecr_repository.main["frontend"].repository_url
}

output "backend_repository_arn" {
  description = "ECR repository ARN for the backend image"
  value       = aws_ecr_repository.main["backend"].arn
}

output "frontend_repository_arn" {
  description = "ECR repository ARN for the frontend image"
  value       = aws_ecr_repository.main["frontend"].arn
}

output "registry_id" {
  description = "ECR registry ID (AWS account ID)"
  value       = aws_ecr_repository.main["backend"].registry_id
}
