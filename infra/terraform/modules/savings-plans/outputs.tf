output "rds_recommendation_arn" {
  description = "SSM parameter ARN for RDS reserved instance recommendation"
  value       = aws_ssm_parameter.rds_reserved_instance_recommendation.arn
}

output "elasticache_recommendation_arn" {
  description = "SSM parameter ARN for ElastiCache reserved node recommendation"
  value       = aws_ssm_parameter.elasticache_reserved_node_recommendation.arn
}

output "fargate_recommendation_arn" {
  description = "SSM parameter ARN for Fargate Savings Plan recommendation"
  value       = aws_ssm_parameter.fargate_savings_plan_recommendation.arn
}
