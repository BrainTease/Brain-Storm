# Monitoring & Observability

Brain-Storm ships a full observability stack: **Prometheus metrics**, **OpenTelemetry distributed tracing**, and **Grafana dashboards**.

## Stack

| Component | Purpose | Port |
|-----------|---------|------|
| Prometheus | Metrics collection & alerting | 9090 |
| Grafana | Dashboards | 3002 |
| Alertmanager | Alert routing | 9093 |
| OTel Collector | Trace + metric pipeline | 4317 (gRPC), 4318 (HTTP) |
| Jaeger | Trace storage & UI | 16686 |
| Blackbox Exporter | HTTP endpoint probing | 9115 |
| Node Exporter | Host metrics | 9100 |
| Postgres Exporter | DB metrics | 9187 |

## Start

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

- Grafana: http://localhost:3002 (admin / admin)
- Prometheus: http://localhost:9090
- Jaeger UI: http://localhost:16686

## Metrics

The backend exposes Prometheus metrics at `GET /metrics` via `@willsoto/nestjs-prometheus`.

Custom metrics defined in `apps/backend/src/metrics/metrics.service.ts`:

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | HTTP requests by method, route, status_code |
| `credential_issued_total` | Counter | On-chain credentials issued |
| `bst_minted_total` | Counter | BST tokens minted |
| `stellar_rpc_latency_seconds` | Histogram | Stellar RPC call duration |

Default Node.js metrics (event loop lag, heap, GC) are exported automatically.

## Tracing

OTel tracing is bootstrapped in `apps/backend/src/tracing.ts` and initialised before the app starts (`instrument.ts`). Spans are sent to the OTel Collector via OTLP HTTP, then forwarded to Jaeger.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTel Collector URL |
| `OTEL_SERVICE_NAME` | `brain-storm-api` | Service name in traces |
| `OTEL_TRACES_SAMPLER_ARG` | `0.1` (prod), `1.0` (dev) | Sampling ratio |

Auto-instrumented: HTTP, PostgreSQL (`pg`), Redis (`ioredis`), BullMQ, NestJS.

## Grafana Dashboards

Dashboards are provisioned automatically from `infra/monitoring/grafana/dashboards/`.

| Dashboard | UID | Covers |
|-----------|-----|--------|
| API Observability | `brainstorm-observability` | Throughput, error rate, latency (p50/p95), Stellar RPC, credentials, BST tokens, heap |
| NestJS Metrics | `brainstorm-nestjs` | HTTP request rate, status codes |
| Performance Overview | `brainstorm-perf` | End-to-end performance |
| Contracts Monitoring | `brainstorm-contracts` | Soroban contract events |

## Alerts

Alert rules live in:
- `infra/monitoring/alerts/application-rules.yml` — API error rate, latency SLOs
- `infra/monitoring/contracts/alerting-rules.yml` — Contract-specific alerts

Alert routing configured in `infra/monitoring/alertmanager/alertmanager.yml`.
