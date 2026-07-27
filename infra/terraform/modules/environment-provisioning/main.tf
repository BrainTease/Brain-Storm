variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
}

variable "instance_type" {
  type        = string
  default     = "t3.medium"
  description = "EC2 instance type"
}

variable "enable_monitoring" {
  type        = bool
  default     = true
  description = "Enable CloudWatch monitoring"
}

variable "enable_cost_tracking" {
  type        = bool
  default     = true
  description = "Enable cost tracking with tags"
}

variable "auto_cleanup_enabled" {
  type        = bool
  default     = true
  description = "Enable automatic cleanup of resources"
}

variable "cleanup_ttl_hours" {
  type        = number
  default     = 24
  description = "TTL in hours for automatic cleanup"
}

# ─── Environment Provisioning ─────────────────────────────────────────────────

resource "aws_ec2_instance" "environment" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  tags = {
    Name                = "brain-storm-${var.environment}"
    Environment         = var.environment
    ManagedBy           = "terraform"
    CostCenter          = "engineering"
    AutoCleanup         = var.auto_cleanup_enabled
    CleanupTTL          = var.cleanup_ttl_hours
    CreatedAt           = timestamp()
  }

  monitoring = var.enable_monitoring

  lifecycle {
    create_before_destroy = true
  }
}

# ─── CloudWatch Monitoring ────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "environment_cpu" {
  count               = var.enable_monitoring ? 1 : 0
  alarm_name          = "brain-storm-${var.environment}-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when CPU exceeds 80%"

  dimensions = {
    InstanceId = aws_ec2_instance.environment.id
  }
}

resource "aws_cloudwatch_metric_alarm" "environment_disk" {
  count               = var.enable_monitoring ? 1 : 0
  alarm_name          = "brain-storm-${var.environment}-disk"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "DiskSpaceUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Alert when disk usage exceeds 85%"

  dimensions = {
    InstanceId = aws_ec2_instance.environment.id
  }
}

# ─── Cost Tracking ────────────────────────────────────────────────────────────

resource "aws_ce_cost_category" "environment" {
  count = var.enable_cost_tracking ? 1 : 0

  name         = "brain-storm-${var.environment}-costs"
  rule_version = "CostCategoryExpression.v1"

  rules {
    rule {
      rule = jsonencode({
        tags = {
          key    = "Environment"
          values = [var.environment]
        }
      })
      value = var.environment
    }
  }
}

# ─── Data Sources ─────────────────────────────────────────────────────────────

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ─── Outputs ───────────────────────────────────────────────────────────────────

output "instance_id" {
  value       = aws_ec2_instance.environment.id
  description = "EC2 instance ID"
}

output "instance_public_ip" {
  value       = aws_ec2_instance.environment.public_ip
  description = "EC2 instance public IP"
}

output "instance_private_ip" {
  value       = aws_ec2_instance.environment.private_ip
  description = "EC2 instance private IP"
}

output "monitoring_enabled" {
  value       = var.enable_monitoring
  description = "Whether monitoring is enabled"
}

output "cost_tracking_enabled" {
  value       = var.enable_cost_tracking
  description = "Whether cost tracking is enabled"
}
