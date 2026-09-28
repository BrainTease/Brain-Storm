# Chaos Testing Guide

> Closes **#1194** — backend resilience via Chaos Mesh experiments.

This document explains how to run chaos experiments against the Brain-Storm backend to verify that it degrades gracefully when dependencies fail.

---

## Overview

The chaos testing strategy has **two layers**:

| Layer | What it tests | How to run |
|-------|--------------|------------|
| **Unit / CI** | Error-handling logic in the HealthController — mocks all dependencies | `npm test` (runs automatically in CI) |
| **Integration / staging** | Real degradation behaviour with live infrastructure | `CHAOS_TEST=true` + Chaos Mesh |

The unit tests in `apps/backend/src/health/chaos-resilience.spec.ts` run on every PR and verify the graceful-degradation contract without requiring a Kubernetes cluster.

---

## Prerequisites

Before running integration-mode chaos tests you need:

| Tool | Purpose |
|------|---------|
| Kubernetes cluster (v1.18+) | Chaos Mesh requires a K8s cluster |
| [Helm 3](https://helm.sh/) | Install Chaos Mesh |
| `kubectl` configured | Apply experiments |
| Brain-Storm running in staging | Accessible at `CHAOS_BACKEND_URL` |

---

## 1. Install Chaos Mesh

```bash
chmod +x infra/chaos-mesh/install.sh
./infra/chaos-mesh/install.sh
```

Verify:

```bash
kubectl get pods -n chaos-mesh
# chaos-controller-manager-...   Running
# chaos-daemon-...                Running
# chaos-dashboard-...             Running
```

Access the Chaos Mesh dashboard (optional):

```bash
kubectl port-forward -n chaos-mesh svc/chaos-dashboard 2333:2333
# Open http://localhost:2333
```

---

## 2. Experiments

All experiments live in `infra/chaos-mesh/`.

| File | Experiment | What it simulates |
|------|-----------|------------------|
| `chaos-experiments.yaml` | NetworkChaos, PodChaos, StressChaos | Network latency, pod kills, CPU stress |
| `db-latency-experiment.yaml` | `brain-storm-db-latency` | 500 ms ± 100 ms latency on DB connections |
| `db-latency-experiment.yaml` | `brain-storm-redis-kill` | Redis pod killed for 90 s |
| `db-latency-experiment.yaml` | `brain-storm-stellar-partition` | 100% packet loss to Stellar Horizon |

### 2a. Database latency injection

Injects 500 ms ± 100 ms latency on TCP traffic from the backend to PostgreSQL port 5432.

```bash
kubectl apply -f infra/chaos-mesh/db-latency-experiment.yaml \
  -l experiment=db-latency
```

**Expected behaviour:**
- `GET /health/readiness` → HTTP **503** (not 500, not a crash)
- `GET /health/liveness` → HTTP **200** (process still alive)
- Response body is valid JSON with a `status` field

Revert:

```bash
kubectl delete -f infra/chaos-mesh/db-latency-experiment.yaml \
  -l experiment=db-latency
```

### 2b. Redis pod kill

Kills the Redis pod for 90 seconds.

```bash
kubectl apply -f infra/chaos-mesh/db-latency-experiment.yaml \
  -l experiment=redis-kill
```

**Expected behaviour:**
- `GET /health/readiness` → HTTP **503**
- `GET /health/liveness` → HTTP **200**
- Cache-miss requests served from DB if fallback is implemented

Revert:

```bash
kubectl delete -f infra/chaos-mesh/db-latency-experiment.yaml \
  -l experiment=redis-kill
```

### 2c. Stellar Horizon partition

Drops 100% of outbound traffic to Stellar Horizon endpoints.

```bash
kubectl apply -f infra/chaos-mesh/db-latency-experiment.yaml \
  -l experiment=stellar-partition
```

**Expected behaviour:**
- `GET /health/readiness` → HTTP **503** (Stellar check fails)
- `GET /health/liveness` → HTTP **200**
- Stellar-independent endpoints continue to work

Revert:

```bash
kubectl delete -f infra/chaos-mesh/db-latency-experiment.yaml \
  -l experiment=stellar-partition
```

---

## 3. Running the automated chaos tests

### Unit mode (no cluster required — default CI)

```bash
cd apps/backend
npm test -- --testPathPattern=chaos-resilience
```

### Integration mode (staging cluster required)

```bash
# 1. Deploy the target experiment (e.g. DB latency)
kubectl apply -f infra/chaos-mesh/db-latency-experiment.yaml \
  -l experiment=db-latency

# 2. Run the integration tests against the staging backend
CHAOS_TEST=true CHAOS_BACKEND_URL=https://staging.brain-storm.example.com \
  cd apps/backend && npm test -- --testPathPattern=chaos-resilience

# 3. Tear down the experiment
kubectl delete -f infra/chaos-mesh/db-latency-experiment.yaml \
  -l experiment=db-latency
```

---

## 4. Acceptance criteria

All criteria from issue #1194:

- [x] **Chaos experiment runs** against staging-like environment (DB latency, Redis kill, Stellar partition)
- [x] **Graceful degradation verified**: backend returns HTTP 503 (never crashes) when dependencies are down
- [x] **Liveness remains up** even when readiness fails
- [x] **Documented** (this document + inline test comments)
- [x] **Unit tests run in CI** without infrastructure

---

## 5. Recovery procedures

### Backend unresponsive after chaos

```bash
kubectl get pods -l app=brain-storm-backend
kubectl logs -l app=brain-storm-backend --tail=100
kubectl rollout restart deployment/brain-storm-backend
```

### Database connection not recovering

```bash
# Check the NetworkChaos resource is deleted
kubectl get networkchaos
kubectl delete networkchaos brain-storm-db-latency

# Verify the DB pod
kubectl get pods -l app=postgres
kubectl rollout restart deployment/postgres
```

### Redis not recovering

```bash
kubectl get pods -l app=redis
kubectl rollout restart deployment/redis
```

### Stellar Horizon partition still active

```bash
kubectl delete networkchaos brain-storm-stellar-partition
```

---

## 6. CI integration

The unit-mode tests are already included in the standard Jest test suite and run on every pull request via `.github/workflows/ci.yml`.

To add integration-mode chaos tests to a dedicated staging pipeline, add a step like:

```yaml
- name: Run chaos resilience tests
  env:
    CHAOS_TEST: "true"
    CHAOS_BACKEND_URL: ${{ secrets.STAGING_API_URL }}
  run: |
    kubectl apply -f infra/chaos-mesh/db-latency-experiment.yaml -l experiment=db-latency
    sleep 10  # let experiment stabilise
    cd apps/backend && npm test -- --testPathPattern=chaos-resilience
    kubectl delete -f infra/chaos-mesh/db-latency-experiment.yaml -l experiment=db-latency
```

---

## 7. Related files

| File | Purpose |
|------|---------|
| `infra/chaos-mesh/chaos-experiments.yaml` | Original network/pod/stress experiments |
| `infra/chaos-mesh/db-latency-experiment.yaml` | DB latency + Redis kill + Stellar partition (added in #1194) |
| `infra/chaos-mesh/install.sh` | Chaos Mesh installer |
| `apps/backend/src/health/chaos-resilience.spec.ts` | Automated graceful-degradation tests |
| `apps/backend/src/health/health.controller.ts` | The health endpoints under test |
