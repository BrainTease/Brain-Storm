output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "http_listener_arn" {
  description = "ARN of the HTTP listener (used by API Gateway VPC Link integration)"
  value       = aws_lb_listener.http.arn
}
