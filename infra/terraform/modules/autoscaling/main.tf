locals {
  services = {
    backend = {
      service_name  = var.backend_service_name
      min_capacity  = var.backend_min_capacity
      max_capacity  = var.backend_max_capacity
      cpu_target    = var.backend_cpu_target
      memory_target = var.backend_memory_target
    }
    frontend = {
      service_name  = var.frontend_service_name
      min_capacity  = var.frontend_min_capacity
      max_capacity  = var.frontend_max_capacity
      cpu_target    = var.frontend_cpu_target
      memory_target = var.frontend_memory_target
    }
  }
}

# ─── Application Auto Scaling Targets ─────────────────────────────────────────

resource "aws_appautoscaling_target" "ecs" {
  for_each = local.services

  max_capacity       = each.value.max_capacity
  min_capacity       = each.value.min_capacity
  resource_id        = "service/${var.cluster_name}/${each.value.service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# ─── CPU Scaling Policies ─────────────────────────────────────────────────────

resource "aws_appautoscaling_policy" "cpu" {
  for_each = local.services

  name               = "${var.environment}-brain-storm-${each.key}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = each.value.cpu_target
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ─── Memory Scaling Policies ──────────────────────────────────────────────────

resource "aws_appautoscaling_policy" "memory" {
  for_each = local.services

  name               = "${var.environment}-brain-storm-${each.key}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = each.value.memory_target
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ─── CloudWatch Alarms for Scaling Events ─────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "backend_high_cpu" {
  alarm_name          = "${var.environment}-brain-storm-backend-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.backend_cpu_target
  alarm_description   = "Backend ECS CPU utilization above target"

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.backend_service_name
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "frontend_high_cpu" {
  alarm_name          = "${var.environment}-brain-storm-frontend-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.frontend_cpu_target
  alarm_description   = "Frontend ECS CPU utilization above target"

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.frontend_service_name
  }

  tags = {
    Environment = var.environment
  }
}
