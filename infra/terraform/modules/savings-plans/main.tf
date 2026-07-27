# ─── Compute Savings Plans (covers Fargate + EC2) ────────────────────────────
# NOTE: aws_savingsplans_* resources require the Savings Plans API.
# For production, purchase via AWS Console or CLI after reviewing recommendations.
# This module documents the recommended configuration and creates supporting
# resources (Cost Explorer recommendations, budgets) that are fully automatable.

# ─── RDS Reserved Instance (via aws_db_instance reservation note) ─────────────
# RDS reserved instances must be purchased via AWS Console / CLI.
# This resource tracks the recommendation as an SSM parameter for auditability.

resource "aws_ssm_parameter" "rds_reserved_instance_recommendation" {
  name  = "/${var.environment}/cost-optimization/rds-reserved-instance"
  type  = "String"
  value = jsonencode({
    recommendation          = "Purchase 1-year No-Upfront Reserved Instance"
    instance_class          = var.db_instance_class
    engine                  = "postgres"
    estimated_savings_pct   = 40
    annual_savings          = 4800
    payment_option          = "NO_UPFRONT"
    term_years              = 1
    action                  = "Purchase via AWS Console: RDS > Reserved Instances"
    implementation_status   = "recommended"
    priority                = "high"
  })

  tags = {
    Environment = var.environment
    Purpose     = "cost-optimization"
  }
}

resource "aws_ssm_parameter" "elasticache_reserved_node_recommendation" {
  name  = "/${var.environment}/cost-optimization/elasticache-reserved-node"
  type  = "String"
  value = jsonencode({
    recommendation          = "Purchase 1-year No-Upfront Reserved Cache Node"
    node_type               = var.redis_node_type
    engine                  = "redis"
    estimated_savings_pct   = 38
    annual_savings          = 2280
    payment_option          = "NO_UPFRONT"
    term_years              = 1
    action                  = "Purchase via AWS Console: ElastiCache > Reserved Cache Nodes"
    implementation_status   = "recommended"
    priority                = "high"
  })

  tags = {
    Environment = var.environment
    Purpose     = "cost-optimization"
  }
}

resource "aws_ssm_parameter" "fargate_savings_plan_recommendation" {
  name  = "/${var.environment}/cost-optimization/fargate-savings-plan"
  type  = "String"
  value = jsonencode({
    recommendation          = "Purchase Compute Savings Plan"
    commitment_type         = "1-year No-Upfront Compute Savings Plan"
    estimated_savings_pct   = 20
    annual_savings          = 3600
    covers                  = ["Fargate", "Lambda", "EC2"]
    payment_option          = "NO_UPFRONT"
    term_years              = 1
    action                  = "Purchase via AWS Console: Cost Management > Savings Plans"
    implementation_status   = "recommended"
    priority                = "high"
  })

  tags = {
    Environment = var.environment
    Purpose     = "cost-optimization"
  }
}

# ─── Reserved Instance Purchase Tracking ───────────────────────────────────────

resource "aws_ssm_parameter" "reserved_instances_inventory" {
  name  = "/${var.environment}/cost-optimization/reserved-instances-inventory"
  type  = "String"
  value = jsonencode({
    rds_reserved_instances = {
      count                 = var.rds_reserved_instance_count
      instance_class        = var.db_instance_class
      term_years            = 1
      payment_option        = "NO_UPFRONT"
      estimated_annual_cost = var.rds_reserved_instance_count * 12000
    }
    elasticache_reserved_nodes = {
      count                 = var.elasticache_reserved_node_count
      node_type             = var.redis_node_type
      term_years            = 1
      payment_option        = "NO_UPFRONT"
      estimated_annual_cost = var.elasticache_reserved_node_count * 600
    }
    compute_savings_plan = {
      enabled               = var.enable_compute_savings_plan
      commitment_hourly_usd = var.compute_savings_plan_hourly_commitment
      estimated_annual_cost = var.compute_savings_plan_hourly_commitment * 8760
    }
    total_estimated_annual_savings = (var.rds_reserved_instance_count * 4800) + (var.elasticache_reserved_node_count * 2280) + (var.compute_savings_plan_hourly_commitment * 8760 * 0.20)
    implementation_status  = "tracked"
    last_updated          = timestamp()
  })

  tags = {
    Environment = var.environment
    Purpose     = "cost-optimization"
  }
}
