variable "aws_region"       { type = string; default = "us-east-1" }
variable "account_id"       { type = string }
variable "vpc_cidr"         { type = string; default = "10.0.0.0/16" }
variable "db_name"          { type = string; default = "brainstorm" }
variable "db_username"      { type = string; sensitive = true }
variable "db_password"      { type = string; sensitive = true }
variable "db_instance_class"{ type = string; default = "db.t3.medium" }
variable "redis_node_type"  { type = string; default = "cache.t3.medium" }
variable "jwt_secret"       { type = string; sensitive = true }
variable "stellar_secret_key" { type = string; sensitive = true }
variable "github_org"       { type = string }
variable "github_repo"      { type = string; default = "Brain-Storm" }
variable "cors_allowed_origins" { type = list(string); default = ["https://brain-storm.example.com"] }
variable "alert_sns_arns"   { type = list(string); default = [] }
