# ─── Cost Analysis Module ─────────────────────────────────────────────────────
# This module provides cost analysis, recommendations, and tracking for AWS resources.

# ─── Cost Explorer Configuration ───────────────────────────────────────────────

resource "aws_ce_cost_category" "engineering" {
  name        = "${var.environment}-brain-storm-cost-categories"
  rule_version = "CostCategoryVersion.v2"

  rules = jsonencode([
    {
      rule = [
        {
          dimension = {
            key           = "SERVICE"
            match_options = ["EQUALS"]
            values        = ["Amazon EC2"]
          }
        }
      ]
      tags = {
        key           = "Team"
        match_options = ["KEY_AND_VALUE"]
        values        = ["backend"]
      }
      value = "Backend-Compute"
    },
    {
      rule = [
        {
          dimension = {
            key           = "SERVICE"
            match_options = ["EQUALS"]
            values        = ["Amazon Elastic Container Service"]
          }
        }
      ]
      value = "Container-Services"
    },
    {
      rule = [
        {
          dimension = {
            key           = "SERVICE"
            match_options = ["EQUALS"]
            values        = ["Amazon Relational Database Service"]
          }
        }
      ]
      value = "Database"
    },
    {
      rule = [
        {
          dimension = {
            key           = "SERVICE"
            match_options = ["EQUALS"]
            values        = ["Amazon ElastiCache"]
          }
        }
      ]
      value = "Caching"
    }
  ])

  tags = {
    Name        = "${var.environment}-brain-storm-cost-categories"
    Environment = var.environment
    Purpose     = "cost-analysis"
  }
}

# ─── Cost Anomaly Detection ───────────────────────────────────────────────────

resource "aws_ce_anomaly_monitor" "overall" {
  name          = "${var.environment}-brain-storm-overall-cost-monitor"
  monitor_type  = "OVERALL"
  monitor_specification = jsonencode({
    Tags = {
      key    = "Environment"
      values = [var.environment]
    }
  })

  tags = {
    Name        = "${var.environment}-brain-storm-overall-cost-monitor"
    Environment = var.environment
  }
}

# ─── Cost Anomaly Alert ────────────────────────────────────────────────────────

resource "aws_ce_anomaly_subscription" "cost_alerts" {
  name            = "${var.environment}-brain-storm-cost-anomaly-alerts"
  threshold_expression = "ANOMALY_TOTAL_IMPACT_ABSOLUTE(expected_value, 100)"
  frequency       = "DAILY"
  monitor_arn_list = [aws_ce_anomaly_monitor.overall.arn]

  subscription_type = "SNS"
  sns_topic_arn    = aws_sns_topic.cost_alerts.arn

  tags = {
    Name        = "${var.environment}-brain-storm-cost-alerts-subscription"
    Environment = var.environment
  }
}

# ─── SNS Topic for Cost Alerts ─────────────────────────────────────────────────

resource "aws_sns_topic" "cost_alerts" {
  name = "${var.environment}-brain-storm-cost-alerts"

  tags = {
    Name        = "${var.environment}-brain-storm-cost-alerts"
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "cost_alerts_email" {
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "email"
  endpoint  = var.cost_alert_email

  depends_on = [aws_sns_topic.cost_alerts]
}

# ─── Budget Alerts ────────────────────────────────────────────────────────────

resource "aws_budgets_budget" "monthly_limit" {
  name              = "${var.environment}-brain-storm-monthly-budget"
  budget_type       = "MONTHLY"
  limit_unit        = "USD"
  limit_value       = var.monthly_budget_limit
  time_period_start = "2024-06-01_00:00"
  time_period_end   = "2087-12-31_23:59"

  tags = {
    Name        = "${var.environment}-brain-storm-monthly-budget"
    Environment = var.environment
  }
}

resource "aws_budgets_budget_notification" "monthly_limit_alert" {
  budget_name       = aws_budgets_budget.monthly_limit.name
  comparison_operator = "GREATER_THAN"
  notification_type   = "FORECASTED"
  threshold           = 80
  threshold_type      = "PERCENTAGE"
}

resource "aws_budgets_budget_notification_subscriber" "monthly_limit_email" {
  budget_name              = aws_budgets_budget.monthly_limit.name
  notification_type        = aws_budgets_budget_notification.monthly_limit_alert.notification_type
  comparison_operator      = aws_budgets_budget_notification.monthly_limit_alert.comparison_operator
  threshold                = aws_budgets_budget_notification.monthly_limit_alert.threshold
  threshold_type           = aws_budgets_budget_notification.monthly_limit_alert.threshold_type
  subscriber_email_address = var.cost_alert_email
}

# ─── Service Cost Tags ─────────────────────────────────────────────────────────
# These SSM parameters track cost optimization metrics

resource "aws_ssm_parameter" "cost_optimization_metrics" {
  name  = "/${var.environment}/cost-optimization/metrics"
  type  = "String"
  value = jsonencode({
    last_analyzed  = timestamp()
    monthly_budget = var.monthly_budget_limit
    alert_threshold = 80
    environment = var.environment
  })

  tags = {
    Name        = "${var.environment}-cost-optimization-metrics"
    Environment = var.environment
  }
}

# ─── CloudWatch Log Group for Cost Analysis ────────────────────────────────────

resource "aws_cloudwatch_log_group" "cost_analysis" {
  name              = "/aws/cost-optimization/${var.environment}"
  retention_in_days = 30

  tags = {
    Name        = "${var.environment}-cost-analysis-logs"
    Environment = var.environment
  }
}
