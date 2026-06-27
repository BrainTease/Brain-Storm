output "backend_autoscaling_target_arn" {
  description = "ARN of the backend Application Auto Scaling target"
  value       = aws_appautoscaling_target.ecs["backend"].arn
}

output "frontend_autoscaling_target_arn" {
  description = "ARN of the frontend Application Auto Scaling target"
  value       = aws_appautoscaling_target.ecs["frontend"].arn
}
