plugin "aws" {
  enabled = true
  version = "0.29.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

rule "terraform_comment_syntax" {
  enabled = true
}

rule "terraform_deprecated_index" {
  enabled = true
}

rule "terraform_deprecated_interpolation" {
  enabled = true
}

rule "terraform_empty_list_equality" {
  enabled = true
}

rule "terraform_module_pinned_source" {
  enabled = true
}

rule "terraform_naming_convention" {
  enabled = true
  format  = "snake_case"
}

rule "terraform_required_providers" {
  enabled = true
}

rule "terraform_required_version" {
  enabled = true
}

rule "terraform_standard_module_structure" {
  enabled = true
}

rule "terraform_typed_variables" {
  enabled = true
}

rule "terraform_unused_declarations" {
  enabled = true
}

rule "terraform_unused_required_providers" {
  enabled = true
}

rule "terraform_workspace_remote" {
  enabled = true
}

# AWS-specific rules
rule "aws_instance_default_security_group" {
  enabled = true
}

rule "aws_instance_metadata_options" {
  enabled = true
}

rule "aws_instance_requires_vpc_security_group_set" {
  enabled = true
}

rule "aws_rds_cluster_encryption" {
  enabled = true
}

rule "aws_rds_cluster_multi_az" {
  enabled = true
}

rule "aws_s3_bucket_acl" {
  enabled = true
}

rule "aws_s3_bucket_server_side_encryption_configuration" {
  enabled = true
}

rule "aws_s3_bucket_versioning" {
  enabled = true
}

rule "aws_security_group_rule_description" {
  enabled = true
}

rule "aws_security_group_rule_ingress_description" {
  enabled = true
}

rule "aws_security_group_rule_egress_description" {
  enabled = true
}

rule "aws_elb_https_listener" {
  enabled = true
}

rule "aws_alb_https_listener" {
  enabled = true
}

rule "aws_elasticache_replication_group_encryption_at_rest" {
  enabled = true
}

rule "aws_elasticache_replication_group_encryption_in_transit" {
  enabled = true
}

rule "aws_elasticache_replication_group_automatic_failover" {
  enabled = true
}
