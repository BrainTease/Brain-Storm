output "cost_analysis_log_group" {
  description = "CloudWatch log group for cost analysis"
  value       = aws_cloudwatch_log_group.cost_analysis.name
}

output "cost_anomaly_monitor_arn" {
  description = "Cost Anomaly Monitor ARN"
  value       = aws_ce_anomaly_monitor.overall.arn
}

output "sns_topic_arn" {
  description = "SNS topic ARN for cost alerts"
  value       = aws_sns_topic.cost_alerts.arn
}

output "budget_arn" {
  description = "Budget ARN for monthly cost limit"
  value       = aws_budgets_budget.monthly_limit.arn
}
