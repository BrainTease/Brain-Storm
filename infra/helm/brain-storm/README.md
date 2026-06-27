# Brain-Storm Helm Chart

Deploys the full Brain-Storm stack to any Kubernetes cluster.

## Prerequisites

- Kubernetes 1.25+
- Helm 3.10+
- NGINX Ingress Controller (or set `ingress.className` to your controller)
- cert-manager (optional, for automatic TLS)

## Quick Install

```bash
# 1. Create the secrets Kubernetes needs (never commit these)
kubectl create secret generic brain-storm-backend-secret \
  --from-literal=DATABASE_PASSWORD=<db-password> \
  --from-literal=JWT_SECRET=<jwt-secret> \
  --from-literal=STELLAR_SECRET_KEY=<stellar-key>

# 2. Install (staging)
helm upgrade --install brain-storm ./infra/helm/brain-storm \
  -f infra/helm/brain-storm/values-staging.yaml \
  --namespace brain-storm --create-namespace

# 3. Install (production)
helm upgrade --install brain-storm ./infra/helm/brain-storm \
  -f infra/helm/brain-storm/values-prod.yaml \
  --namespace brain-storm --create-namespace
```

## Upgrade

```bash
helm upgrade brain-storm ./infra/helm/brain-storm \
  -f infra/helm/brain-storm/values-prod.yaml \
  --namespace brain-storm
```

## Rollback

```bash
helm rollback brain-storm --namespace brain-storm
```

## Uninstall

```bash
helm uninstall brain-storm --namespace brain-storm
```

## Key Values

| Key | Default | Description |
|-----|---------|-------------|
| `backend.image.tag` | `latest` | Backend image tag |
| `frontend.image.tag` | `latest` | Frontend image tag |
| `backend.autoscaling.enabled` | `true` | Enable backend HPA |
| `backend.existingSecret` | `brain-storm-backend-secret` | K8s secret with DB/JWT/Stellar keys |
| `postgresql.enabled` | `true` | Deploy bundled PostgreSQL (disable for managed DB) |
| `redis.enabled` | `true` | Deploy bundled Redis (disable for managed Redis) |
| `ingress.enabled` | `true` | Enable ingress |
| `ingress.className` | `nginx` | Ingress class |

## Health Probes

| Service | Liveness | Readiness |
|---------|----------|-----------|
| Backend | `GET /v1/health/liveness` | `GET /v1/health/readiness` |
| Frontend | `GET /api/health` | `GET /api/health` |
