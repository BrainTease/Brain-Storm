variable "aws_region"  { type = string; default = "us-east-1" }
variable "account_id"  { type = string }
variable "vpc_cidr"    { type = string; default = "10.1.0.0/16" }
variable "db_name"     { type = string; default = "brainstorm_staging" }
variable "db_username" { type = string; sensitive = true }
variable "db_password" { type = string; sensitive = true }
variable "jwt_secret"  { type = string; sensitive = true }
variable "stellar_secret_key" { type = string; sensitive = true }
variable "github_org"  { type = string }
variable "github_repo" { type = string; default = "Brain-Storm" }
