resource "aws_apigatewayv2_api" "main" {
  name          = "${var.environment}-brain-storm-api"
  protocol_type = "HTTP"
  description   = "Brain-Storm HTTP API Gateway"

  cors_configuration {
    allow_origins = var.cors_allow_origins
    allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Request-ID", "X-Api-Key"]
    max_age       = 86400
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Default stage with auto-deploy
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
  }

  default_route_settings {
    throttling_burst_limit = var.throttle_burst_limit
    throttling_rate_limit  = var.throttle_rate_limit
  }

  tags = {
    Environment = var.environment
  }
}

# VPC link to reach private ECS services
resource "aws_apigatewayv2_vpc_link" "main" {
  name               = "${var.environment}-brain-storm-vpc-link"
  security_group_ids = [aws_security_group.vpc_link.id]
  subnet_ids         = var.private_subnet_ids

  tags = {
    Environment = var.environment
  }
}

resource "aws_security_group" "vpc_link" {
  name        = "${var.environment}-brain-storm-apigw-vpc-link-sg"
  description = "Security group for API Gateway VPC Link"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-brain-storm-apigw-vpc-link-sg"
    Environment = var.environment
  }
}

# Integration — ALB listener via VPC link
resource "aws_apigatewayv2_integration" "backend" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"
  integration_uri    = var.alb_listener_arn

  connection_type = "VPC_LINK"
  connection_id   = aws_apigatewayv2_vpc_link.main.id

  payload_format_version = "1.0"

  request_parameters = {
    "overwrite:header.x-forwarded-for" = "$context.identity.sourceIp"
    "overwrite:header.x-request-id"    = "$context.requestId"
  }
}

# Catch-all proxy route
resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"

  authorization_type = var.default_auth_type
  authorizer_id      = var.default_auth_type != "NONE" ? aws_apigatewayv2_authorizer.jwt[0].id : null
}

# Public health-check route (no auth)
resource "aws_apigatewayv2_route" "health" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /v1/health"
  target             = "integrations/${aws_apigatewayv2_integration.backend.id}"
  authorization_type = "NONE"
}

# JWT authorizer (optional — used when default_auth_type = "JWT")
resource "aws_apigatewayv2_authorizer" "jwt" {
  count            = var.default_auth_type == "JWT" ? 1 : 0
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.environment}-brain-storm-jwt-authorizer"

  jwt_configuration {
    audience = var.jwt_audience
    issuer   = var.jwt_issuer
  }
}

# CloudWatch log group for API Gateway access logs
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.environment}-brain-storm"
  retention_in_days = 90

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Usage plan / throttling alarm
resource "aws_cloudwatch_metric_alarm" "high_4xx" {
  alarm_name          = "${var.environment}-brain-storm-apigw-4xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  threshold           = var.alarm_4xx_threshold
  alarm_description   = "API Gateway 4xx errors exceed threshold"
  alarm_actions       = var.alert_sns_arns

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
    Stage = aws_apigatewayv2_stage.default.name
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "high_5xx" {
  alarm_name          = "${var.environment}-brain-storm-apigw-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  threshold           = var.alarm_5xx_threshold
  alarm_description   = "API Gateway 5xx errors exceed threshold"
  alarm_actions       = var.alert_sns_arns

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
    Stage = aws_apigatewayv2_stage.default.name
  }

  tags = {
    Environment = var.environment
  }
}
