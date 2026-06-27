package terraform

# Security: Deny unrestricted security group access
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_security_group"
    rule := resource.change.after.ingress[_]
    rule.from_port == 0
    rule.to_port == 65535
    rule.cidr_blocks[_] == "0.0.0.0/0"
    msg := sprintf("Security group %s allows unrestricted access (0.0.0.0/0)", [resource.address])
}

# Security: Deny unrestricted SSH access
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_security_group"
    rule := resource.change.after.ingress[_]
    rule.from_port == 22
    rule.to_port == 22
    rule.cidr_blocks[_] == "0.0.0.0/0"
    msg := sprintf("Security group %s allows unrestricted SSH access", [resource.address])
}

# Security: Deny unrestricted RDP access
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_security_group"
    rule := resource.change.after.ingress[_]
    rule.from_port == 3389
    rule.to_port == 3389
    rule.cidr_blocks[_] == "0.0.0.0/0"
    msg := sprintf("Security group %s allows unrestricted RDP access", [resource.address])
}

# Encryption: Require RDS encryption
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_rds_cluster"
    resource.change.after.storage_encrypted == false
    msg := sprintf("RDS cluster %s must have encryption enabled", [resource.address])
}

# Encryption: Require S3 bucket encryption
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    not resource.change.after.server_side_encryption_configuration
    msg := sprintf("S3 bucket %s must have server-side encryption configured", [resource.address])
}

# Versioning: Require S3 bucket versioning
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    versioning := resource.change.after.versioning[_]
    versioning.enabled == false
    msg := sprintf("S3 bucket %s must have versioning enabled", [resource.address])
}

# Backup: Require RDS backup retention
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_rds_cluster"
    resource.change.after.backup_retention_period < 7
    msg := sprintf("RDS cluster %s must have backup retention >= 7 days", [resource.address])
}

# High Availability: Require RDS Multi-AZ
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_rds_cluster"
    resource.change.after.multi_az == false
    msg := sprintf("RDS cluster %s should have Multi-AZ enabled for high availability", [resource.address])
}

# High Availability: Require ElastiCache Multi-AZ
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_elasticache_replication_group"
    resource.change.after.automatic_failover_enabled == false
    msg := sprintf("ElastiCache %s should have automatic failover enabled", [resource.address])
}

# Logging: Require RDS enhanced monitoring
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_rds_cluster"
    resource.change.after.enabled_cloudwatch_logs_exports == null
    msg := sprintf("RDS cluster %s should have CloudWatch logs enabled", [resource.address])
}

# Logging: Require S3 access logging
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    not resource.change.after.logging
    msg := sprintf("S3 bucket %s should have access logging enabled", [resource.address])
}

# Tagging: Require environment tag
deny[msg] {
    resource := input.resource_changes[_]
    resource.type in ["aws_rds_cluster", "aws_elasticache_replication_group", "aws_s3_bucket"]
    not resource.change.after.tags.Environment
    msg := sprintf("Resource %s must have Environment tag", [resource.address])
}

# Tagging: Require project tag
deny[msg] {
    resource := input.resource_changes[_]
    resource.type in ["aws_rds_cluster", "aws_elasticache_replication_group", "aws_s3_bucket"]
    not resource.change.after.tags.Project
    msg := sprintf("Resource %s must have Project tag", [resource.address])
}

# Cost: Warn about large instance types
warn[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_rds_cluster"
    instance_class := resource.change.after.instance_class
    startswith(instance_class, "db.r5.4xlarge")
    msg := sprintf("RDS instance %s uses large instance type - verify cost is acceptable", [resource.address])
}

# Cost: Warn about unencrypted EBS volumes
warn[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_ebs_volume"
    resource.change.after.encrypted == false
    msg := sprintf("EBS volume %s is not encrypted - consider enabling encryption", [resource.address])
}
