# Local Development Setup Guide

Welcome to the **Brain-Storm** monorepo! This guide walks you through setting up the entire development environment from a fresh clone, explaining how each workspace component fits together.

---

## Table of Contents

1. [Monorepo Architecture Overview](#monorepo-architecture-overview)
2. [Prerequisites & Toolchain Versions](#prerequisites--toolchain-versions)
3. [Step-by-Step Setup from Fresh Clone](#step-by-step-setup-from-fresh-clone)
   - [1. Clone Repository](#1-clone-repository)
   - [2. Environment Configuration](#2-environment-configuration)
   - [3. Install Node.js Dependencies](#3-install-nodejs-dependencies)
   - [4. Set Up Rust & Soroban Toolchain](#4-set-up-rust--soroban-toolchain)
   - [5. Start Infrastructure (PostgreSQL & Redis)](#5-start-infrastructure-postgresql--redis)
   - [6. Build Workspaces in Order](#6-build-workspaces-in-order)
   - [7. Run Database Migrations & Seeds](#7-run-database-migrations--seeds)
   - [8. Start Development Servers](#8-start-development-servers)
4. [Environment Variables Reference](#environment-variables-reference)
   - [Backend Variables (`apps/backend`)](#backend-variables-appsbackend)
   - [Frontend Variables (`apps/frontend`)](#frontend-variables-appsfrontend)
5. [Workspace Scripts Reference](#workspace-scripts-reference)
6. [Troubleshooting & Common Issues](#troubleshooting--common-issues)

---

## Monorepo Architecture Overview

The Brain-Storm platform is organized as a multi-tier monorepo:

```
Brain-Storm/
├── apps/
│   ├── backend/             # NestJS REST API, TypeORM, WebSockets, Soroban RPC client
│   └── frontend/            # Next.js 14 (App Router) web application with Tailwind & Freighter
├── packages/
│   ├── types/               # Shared TypeScript domain types and DTO interfaces
│   ├── sdk/                 # Typed REST API client library (@brain-storm/sdk)
│   └── mobile-app/          # React Native mobile application
├── contracts/               # 19 Soroban smart contract crates (Rust/WASM)
│   ├── analytics/           # Learner progress and platform metrics
│   ├── token/               # Brain-Storm Token (BST) SEP-41 implementation
│   ├── certificate/         # Soulbound course completion certificates
│   ├── badges/              # Skill badges and achievements
│   ├── governance/          # On-chain proposals and BST-weighted voting
│   ├── shared/              # RBAC, reentrancy guards, error codes enum
│   └── ...                  # Other domain-specific contracts
├── docs/                    # Architecture records, API specs, setup guides
└── scripts/                 # Automation, contract deployment, and compliance scripts
```

---

## Prerequisites & Toolchain Versions

Ensure the following tools are installed with versions matching the project configurations:

| Tool                        | Version Requirement                | Config Source                             | Purpose                           |
| --------------------------- | ---------------------------------- | ----------------------------------------- | --------------------------------- |
| **Node.js**                 | `>= 18.0.0` (LTS 20.x recommended) | `package.json` engines                    | Backend, Frontend, SDK            |
| **npm**                     | `>= 9.0.0`                         | `package.json`                            | Workspace package management      |
| **Rust**                    | Stable (`>= 1.75.0`)               | `rust-toolchain.toml`                     | Smart contract compilation        |
| **Rust Target**             | `wasm32-unknown-unknown`           | `rust-toolchain.toml`                     | WASM bytecode target              |
| **Soroban SDK**             | `20.0.0`                           | `Cargo.toml` (`[workspace.dependencies]`) | Soroban smart contracts           |
| **Soroban / Stellar CLI**   | `20.0.0` / `v21.5.0`               | `Cargo.toml`                              | Contract compilation & deployment |
| **PostgreSQL**              | `>= 12.0` (15.x recommended)       | `docker-compose.yml`                      | Backend relational database       |
| **Redis**                   | `>= 6.0` (7.x recommended)         | `docker-compose.yml`                      | Session caching & rate limiting   |
| **Docker & Docker Compose** | Latest stable                      | `docker-compose.yml`                      | Local database & services         |

---

## Step-by-Step Setup from Fresh Clone

### 1. Clone Repository

```bash
git clone https://github.com/BrainTease/Brain-Storm.git
cd Brain-Storm
```

### 2. Environment Configuration

Copy the example environment template to `.env` at the root:

```bash
cp .env.example .env
```

### 3. Install Node.js Dependencies

Install all dependencies across root and all workspaces:

```bash
npm install
```

### 4. Set Up Rust & Soroban Toolchain

1. Install Rust via `rustup` (if not already installed):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
2. Add the `wasm32-unknown-unknown` compilation target:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```
3. Install Stellar / Soroban CLI:
   ```bash
   cargo install --locked soroban-cli --version 20.0.0
   # or install Stellar CLI v21.5.0:
   # curl -sSL https://github.com/stellar/stellar-cli/releases/download/v21.5.0/stellar-cli-21.5.0-x86_64-unknown-linux-gnu.tar.gz | tar xz
   # sudo mv stellar /usr/local/bin/
   ```

### 5. Start Infrastructure (PostgreSQL & Redis)

Using Docker Compose is the easiest way to run local databases:

```bash
docker compose up -d postgres redis
```

Verify services are running:

```bash
docker compose ps
```

### 6. Build Workspaces in Order

Because workspaces have inter-dependencies, build them in the following order:

```bash
# 1. Build shared types
npm run build --workspace=packages/types

# 2. Build TypeScript SDK
npm run build --workspace=packages/sdk

# 3. Build smart contracts (WASM)
cargo build --workspace --target wasm32-unknown-unknown --release
# Alternatively run the build helper:
./scripts/build-wasm.sh

# 4. Build backend
npm run build --workspace=apps/backend

# 5. Build frontend (optional for development, required for production)
npm run build --workspace=apps/frontend
```

### 7. Run Database Migrations & Seeds

Initialize the PostgreSQL schema with TypeORM migrations:

```bash
# Run migrations
npm run migration:run --workspace=apps/backend

# (Optional) Seed staging test data
npm run seed:basic --workspace=apps/backend
```

### 8. Start Development Servers

Run backend and frontend concurrently or in separate terminals:

```bash
# Terminal 1: Backend API (NestJS with hot-reload on http://localhost:3000)
npm run dev:backend

# Terminal 2: Frontend App (Next.js 14 with Fast Refresh on http://localhost:3001)
npm run dev:frontend
```

Open your browser:

- **Web Application:** `http://localhost:3001`
- **REST API Swagger Documentation:** `http://localhost:3000/api/docs`

---

## Environment Variables Reference

### Backend Variables (`apps/backend`)

These variables configure the NestJS server, database connections, auth, and Stellar RPC:

| Variable                | Default / Example Value                       | Description                                           | Required |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------- | :------: |
| `PORT`                  | `3000`                                        | HTTP port the NestJS server listens on                |   Yes    |
| `LOG_LEVEL`             | `info`                                        | Logging verbosity (`debug`, `info`, `warn`, `error`)  |    No    |
| `DATABASE_HOST`         | `localhost`                                   | PostgreSQL host (`postgres` when using Docker)        |   Yes    |
| `DATABASE_PORT`         | `5432`                                        | PostgreSQL port                                       |   Yes    |
| `DATABASE_USER`         | `postgres`                                    | Database username                                     |   Yes    |
| `DATABASE_PASSWORD`     | `postgres`                                    | Database password                                     |   Yes    |
| `DATABASE_NAME`         | `brain-storm`                                 | Database name                                         |   Yes    |
| `REDIS_URL`             | `redis://localhost:6379`                      | Redis connection URL                                  |   Yes    |
| `JWT_SECRET`            | `<32-char-random-secret>`                     | Secret key for signing and verifying JWT tokens       |   Yes    |
| `GOOGLE_CLIENT_ID`      | `your_google_client_id`                       | Google OAuth client ID for social login               |    No    |
| `GOOGLE_CLIENT_SECRET`  | `your_google_client_secret`                   | Google OAuth secret                                   |    No    |
| `GOOGLE_CALLBACK_URL`   | `http://localhost:3000/auth/google/callback`  | OAuth redirect callback                               |    No    |
| `STELLAR_NETWORK`       | `testnet`                                     | Target network (`testnet` or `mainnet`)               |   Yes    |
| `STELLAR_SECRET_KEY`    | `S...`                                        | Admin Stellar account secret key for contract signing |   Yes    |
| `STELLAR_HORIZON_URL`   | `https://horizon-testnet.stellar.org`         | Stellar Horizon REST endpoint                         |   Yes    |
| `SOROBAN_RPC_URL`       | `https://soroban-testnet.stellar.org`         | Soroban JSON-RPC node URL                             |   Yes    |
| `ANALYTICS_CONTRACT_ID` | `C...`                                        | Deployed Analytics smart contract address             |    No    |
| `TOKEN_CONTRACT_ID`     | `C...`                                        | Deployed BST Token smart contract address             |    No    |
| `FRONTEND_URL`          | `http://localhost:3001`                       | Origin URL for CORS and email redirect links          |   Yes    |
| `CORS_ORIGINS`          | `http://localhost:3001,http://localhost:3000` | Allowed CORS origins                                  |   Yes    |
| `THROTTLE_TTL`          | `60000`                                       | Rate limiter window in milliseconds                   |    No    |
| `THROTTLE_LIMIT`        | `100`                                         | Maximum requests permitted per window                 |    No    |

### Frontend Variables (`apps/frontend`)

These variables configure the Next.js client application (prefixed with `NEXT_PUBLIC_` for browser bundling):

| Variable                      | Default / Example Value | Description                                         | Required |
| ----------------------------- | ----------------------- | --------------------------------------------------- | :------: |
| `NEXT_PUBLIC_API_URL`         | `http://localhost:3000` | Backend API URL reachable by the browser            |   Yes    |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet`               | Stellar network ID (`testnet` or `mainnet`)         |   Yes    |
| `NEXT_PUBLIC_SENTRY_DSN`      | `https://...`           | Sentry DSN for frontend telemetry & error reporting |    No    |
| `NEXT_PUBLIC_GIT_COMMIT_SHA`  | `main`                  | Git commit identifier for release tracking          |    No    |

---

## Workspace Scripts Reference

### Root Commands (`package.json`)

- `npm run dev:backend` — Starts NestJS backend in watch mode.
- `npm run dev:frontend` — Starts Next.js frontend in development mode.
- `npm run build` — Builds all npm workspaces.
- `npm run test` — Runs tests across all workspaces.

### Smart Contracts (`Cargo.toml`)

- `cargo build --workspace --target wasm32-unknown-unknown` — Compiles all 19 contract crates to WebAssembly.
- `cargo fmt --all -- --check` — Checks Rust code formatting against `rustfmt.toml`.
- `cargo clippy --workspace -- -D warnings` — Lints contracts for anti-patterns and performance issues.
- `cargo test --workspace` — Executes contract unit tests and simulated Soroban runtime suites.

### Backend (`apps/backend`)

- `npm run start:dev --workspace=apps/backend` — Starts backend in watch mode.
- `npm run migration:run --workspace=apps/backend` — Applies pending TypeORM database migrations.
- `npm run export:openapi --workspace=apps/backend` — Exports `openapi.json` specification.

### Frontend (`apps/frontend`)

- `npm run dev --workspace=apps/frontend` — Launches Next.js dev server.
- `npm run lint --workspace=apps/frontend` — Runs ESLint for Next.js and TypeScript.
- `npm run storybook --workspace=apps/frontend` — Launches UI component Storybook on port `6006`.

### TypeScript SDK (`packages/sdk`)

- `npm run build --workspace=packages/sdk` — Compiles TypeScript SDK to `dist/`.
- `npm run docs --workspace=packages/sdk` — Generates public API documentation under `docs/api/sdk`.

---

## Troubleshooting & Common Issues

### 1. Missing `wasm32-unknown-unknown` target

**Error:** `error[E0463]: can't find crate for 'core'` or `target 'wasm32-unknown-unknown' not found`
**Fix:** Run `rustup target add wasm32-unknown-unknown`.

### 2. Database Connection Refused

**Error:** `ConnectionRefusedError: connect ECONNREFUSED 127.0.0.1:5432`
**Fix:** Ensure PostgreSQL is running via `docker compose up -d postgres` and that `DATABASE_PORT=5432` is not blocked by another local database.

### 3. Packages Import Not Found in Backend/Frontend

**Error:** `Cannot find module '@brain-storm/types'` or `@brain-storm/sdk`
**Fix:** Build the package first: `npm run build --workspace=packages/types` and `npm run build --workspace=packages/sdk`.

### 4. Port Conflict on 3000 or 3001

**Fix:** If port 3000 is occupied, set `PORT=3005` in `.env` for backend, and update `NEXT_PUBLIC_API_URL=http://localhost:3005`.
