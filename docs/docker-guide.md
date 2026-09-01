# Docker Setup Guide

Complete Docker containerization for the Brain-Storm full stack: backend (NestJS), frontend (Next.js), Postgres, Redis, and Soroban smart contract build container.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   brain-storm network                │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌───────────────┐  │
│  │ postgres │    │  redis   │    │    backend    │  │
│  │  :5432   │◄───│  :6379   │◄───│    :3000      │  │
│  └──────────┘    └──────────┘    └───────┬───────┘  │
│                                          │           │
│                                  ┌───────▼───────┐  │
│                                  │   frontend    │  │
│                                  │    :3001      │  │
│                                  └───────────────┘  │
└─────────────────────────────────────────────────────┘

  ┌──────────────────────────────┐
  │     contracts-builder        │  (profile: contracts)
  │   Rust + Stellar CLI         │
  │   outputs: *.wasm artifacts  │
  └──────────────────────────────┘
```

## Quick Start

### Full stack (development)

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### Build smart contracts

```bash
# Build WASM artifacts using the contract build container
docker compose --profile contracts run --rm contracts-builder

# Artifacts are placed in the wasm_artifacts volume
```

## Services

| Service  | Port | Health Check      |
| -------- | ---- | ----------------- |
| postgres | 5432 | `pg_isready`      |
| redis    | 6379 | `redis-cli ping`  |
| backend  | 3000 | `GET /health`     |
| frontend | 3001 | `GET /api/health` |

## Dockerfiles

### Backend (`apps/backend/Dockerfile`)

Multi-stage build:

1. **deps** — installs production dependencies
2. **build** — compiles TypeScript
3. **runner** — minimal production image

### Frontend (`apps/frontend/Dockerfile`)

Multi-stage build:

1. **builder** — runs `next build` with standalone output
2. **runner** — copies only the standalone bundle; no Node modules needed

### Contracts (`contracts/Dockerfile`)

Multi-stage build:

1. **builder** — Rust stable + `wasm32-unknown-unknown` target + Stellar CLI; runs `scripts/build.sh`
2. **artifacts** — `scratch` image containing only the compiled `.wasm` files

## Health Checks

All services declare `healthcheck` blocks. `depends_on` conditions use `service_healthy` so containers only start once their dependencies are ready.

```yaml
healthcheck:
  test: ['CMD-SHELL', 'pg_isready -U brain-storm -d brain-storm']
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 10s
```

## Container Networking

All services share the `brain-storm` bridge network. Services reference each other by service name (e.g., `DATABASE_HOST: postgres`). The frontend calls the backend via `http://backend:3000` inside the network.

## Production Overrides

Use `docker-compose.prod.yml` for production-specific settings:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Useful Commands

```bash
# Rebuild a single service
docker compose build backend

# Scale backend (multiple replicas)
docker compose up -d --scale backend=3

# Check service health
docker compose ps

# Access postgres shell
docker compose exec postgres psql -U brain-storm -d brain-storm

# Access redis CLI
docker compose exec redis redis-cli

# View container resource usage
docker stats
```
