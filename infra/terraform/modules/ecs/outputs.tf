output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "backend_target_group_arn" {
  description = "Backend target group ARN"
  value       = aws_lb_target_group.backend.arn
}

output "frontend_target_group_arn" {
  description = "Frontend target group ARN"
  value       = aws_lb_target_group.frontend.arn
}

output "backend_security_group_id" {
  description = "Security group ID for ECS backend tasks"
  value       = aws_security_group.ecs_backend.id
}

output "frontend_security_group_id" {
  description = "Security group ID for ECS frontend tasks"
  value       = aws_security_group.ecs_frontend.id
}

output "backend_service_name" {
  description = "ECS backend service name (for auto-scaling)"
  value       = aws_ecs_service.backend.name
}

output "frontend_service_name" {
  description = "ECS frontend service name (for auto-scaling)"
  value       = aws_ecs_service.frontend.name
}

output "ecs_task_role_arn" {
  description = "ECS task IAM role ARN"
  value       = aws_iam_role.ecs_task.arn
}

output "ecs_execution_role_arn" {
  description = "ECS task execution IAM role ARN"
  value       = aws_iam_role.ecs_execution.arn
}
