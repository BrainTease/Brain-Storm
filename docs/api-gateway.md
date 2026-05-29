# API Gateway

## Overview

Brain-Storm uses a two-layer API gateway:

1. **AWS API Gateway (HTTP API)** — Terraform-managed, terminates TLS, enforces throttling, adds CORS headers, and proxies requests to the Application Load Balancer via a VPC Link.
2. **NestJS `GatewayModule`** — application-level gateway that registers route definitions, enforces per-route authentication requirements, and logs every request/response with latency.

## AWS API Gateway

### Infrastructure

Provisioned by `infra/terraform/modules/api-gateway`.

| Resource | Purpose |
|---|---|
| `aws_apigatewayv2_api` | HTTP API with built-in CORS |
| `aws_apigatewayv2_stage` | `$default` stage with auto-deploy and access logging |
| `aws_apigatewayv2_vpc_link` | Private connectivity to the ALB |
| `aws_apigatewayv2_integration` | HTTP_PROXY integration — forwards `ANY /{proxy+}` to the ALB |
| `aws_apigatewayv2_route` | Catch-all + public `/v1/health` route |
| `aws_apigatewayv2_authorizer` | Optional JWT authorizer (enable via `default_auth_type = "JWT"`) |
| `aws_cloudwatch_log_group` | Access logs retained 90 days |
| CloudWatch alarms | Alert on elevated 4xx (> 100/min) and 5xx (> 10/min) error rates |

### Request routing

All traffic enters through the API Gateway endpoint and is forwarded to the ALB:

```
Client → API Gateway (HTTPS) → VPC Link → ALB → ECS backend/frontend
```

The gateway adds two headers to every forwarded request:
- `x-forwarded-for`: original client IP
- `x-request-id`: API Gateway request ID (useful for log correlation)

### Rate limiting

Default throttling (configurable via Terraform variables):

| Setting | Default |
|---|---|
| Burst limit | 500 req |
| Rate limit | 100 req/s |

These limits are global across all routes and are enforced before requests reach the application. Application-level per-user rate limiting is applied by `UserRateLimitGuard` (see [api-rate-limiting.md](./api-rate-limiting.md)).

### CORS

CORS headers are applied at the gateway layer. Allowed origins are controlled by the `api_gateway_cors_origins` Terraform variable (default `["*"]`; set to specific origins in production).

### Authentication

Set `default_auth_type = "JWT"` in the `api_gateway` module to enable JWT validation at the gateway edge. Configure `jwt_audience` and `jwt_issuer` to match the backend JWT configuration.

By default (`default_auth_type = "NONE"`) authentication is handled entirely by the NestJS guards.

### Deployment

```bash
terraform -chdir=infra/terraform apply -target=module.api_gateway
```

The `$default` stage auto-deploys on every Terraform apply.

## NestJS GatewayModule

Located at `apps/backend/src/gateway/`.

### Components

| File | Role |
|---|---|
| `gateway.service.ts` | Route registry; `resolveRoute()` maps method+path to a `RouteDefinition` |
| `gateway.interceptor.ts` | `GatewayLoggingInterceptor` — logs method, path, userId, IP, status, duration on every request |
| `gateway.guard.ts` | `GatewayAuthGuard` — enforces `authRequired` from the route definition |
| `gateway.controller.ts` | `/v1/gateway/health` (public) and `/v1/gateway/routes` (admin) |
| `gateway.module.ts` | NestJS module wiring everything together |

### Route definitions

Routes are declared in `gateway.service.ts`:

| Path | Methods | Auth | Rate-limit tier |
|---|---|---|---|
| `/v1/auth/**` | GET, POST | No | `auth` |
| `/v1/courses/**` | GET, POST, PATCH, DELETE | Yes | `default` |
| `/v1/users/**` | GET, PATCH, DELETE | Yes | `default` |
| `/v1/stellar/**` | GET, POST | Yes | `write` |
| `/v1/credentials/**` | GET, POST | Yes | `default` |
| `/v1/secrets/**` | GET, POST | Yes | `admin` |
| `/v1/metrics/**` | GET | Yes | `admin` |
| `/v1/health` | GET | No | `default` |

### Request/response logging

`GatewayLoggingInterceptor` is registered as a global `APP_INTERCEPTOR` in `app.module.ts`. Every request logs:

```json
{
  "method": "GET",
  "path": "/v1/courses",
  "userId": "uuid",
  "ip": "1.2.3.4",
  "userAgent": "...",
  "requestId": "apigw-request-id",
  "statusCode": 200,
  "durationMs": 42
}
```

Errors are logged at `WARN` level with the error message included.

### Admin endpoints

```
GET /v1/gateway/health
→ { status: "ok", routes: 8, version: "1.0.0" }

GET /v1/gateway/routes          (admin JWT required)
→ { routes: [...RouteDefinition] }
```

## Log correlation

Each request carries an `x-request-id` header injected by API Gateway. The NestJS interceptor logs this as `requestId`. Use it to correlate:

- AWS API Gateway access logs (`/aws/apigateway/{env}-brain-storm`)
- Application logs (CloudWatch / Sentry)
- Audit logs (`audit_logs.metadata.requestId`)
