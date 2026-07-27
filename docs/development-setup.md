# Developer Setup Guide

Complete guide for setting up Brain-Storm locally from scratch.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | v18+ | [nodejs.org](https://nodejs.org) |
| npm | v9+ | Bundled with Node.js |
| Rust | v1.75+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Stellar CLI | v21.5.0 | See below |
| PostgreSQL | v12+ | [postgresql.org](https://www.postgresql.org/download/) or Docker |
| Redis | v6+ | [redis.io](https://redis.io/download) or Docker |
| Docker | Optional | [docker.com](https://docs.docker.com/get-docker/) |

### Install Stellar CLI

```bash
curl -sSL https://github.com/stellar/stellar-cli/releases/download/v21.5.0/stellar-cli-21.5.0-x86_64-unknown-linux-gnu.tar.gz | tar xz
sudo mv stellar /usr/local/bin/
stellar --version  # should print v21.5.0
```

---

## 1. Clone & Configure Environment

```bash
git clone https://github.com/your-org/brain-storm.git
cd brain-storm
cp .env.example .env
```

Edit `.env` and fill in the required values:

| Variable | Example Value | Notes |
|---|---|---|
| `DATABASE_HOST` | `localhost` | Use `postgres` inside Docker |
| `DATABASE_PORT` | `5432` | |
| `DATABASE_NAME` | `brain-storm` | |
| `DATABASE_USERNAME` | `postgres` | |
| `DATABASE_PASSWORD` | `postgres` | |
| `REDIS_HOST` | `localhost` | Use `redis` inside Docker |
| `REDIS_PORT` | `6379` | |
| `JWT_SECRET` | `<random-32-char-string>` | `openssl rand -hex 32` |
| `STELLAR_NETWORK` | `testnet` | |
| `STELLAR_SECRET_KEY` | `S...` | See Stellar testnet section below |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | |

---

## 2. Database Setup

### Option A — Docker (recommended)

```bash
docker compose up -d postgres redis
```

PostgreSQL will be available at `localhost:5432` and Redis at `localhost:6379`.

### Option B — Manual

```bash
# PostgreSQL
createdb brain-storm
psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE \"brain-storm\" TO postgres;"

# Redis — start the server
redis-server --daemonize yes
```

---

## 3. Stellar Testnet Account

1. Generate a new keypair:
   ```bash
   stellar keys generate --network testnet dev-account
   stellar keys address dev-account   # prints your public key
   stellar keys show dev-account      # prints your secret key (starts with S)
   ```

2. Fund the account via Friendbot:
   ```bash
   curl "https://friendbot.stellar.org?addr=$(stellar keys address dev-account)"
   ```
   Or use [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=testnet).

3. Copy the secret key into `STELLAR_SECRET_KEY` in your `.env`.

### Re-funding an existing account

Testnet accounts are reset periodically. To re-fund the account configured in `.env`:

```bash
./scripts/fund-testnet.sh
```

The script reads `STELLAR_SECRET_KEY` from `.env`, derives the public key, and calls Friendbot automatically.

### API endpoint (testnet only)

When `STELLAR_NETWORK=testnet`, the backend exposes a funding endpoint:

```
POST /v1/stellar/fund-testnet
Content-Type: application/json

{ "publicKey": "G..." }
```

This is disabled (returns 400) when `STELLAR_NETWORK=mainnet`.

### Profile page

On the profile page, a **Fund Testnet Account** button appears in the wallet section whenever `NEXT_PUBLIC_STELLAR_NETWORK=testnet`. Clicking it calls the endpoint above for the linked wallet address.

---

## 4. Install Dependencies & Build Contracts

```bash
# Install all Node.js dependencies (root + workspaces)
npm install

# Add Wasm compilation target
rustup target add wasm32-unknown-unknown

# Build all Soroban contracts
./scripts/build.sh
```

---

## 5. Deploy Contracts to Testnet

```bash
./scripts/deploy.sh testnet analytics
./scripts/deploy.sh testnet token
./scripts/deploy.sh testnet certificate
```

Contract addresses are saved to `scripts/deployed-contracts.json`. Copy the relevant addresses into your `.env`.

---

## 6. Run the Application

```bash
# Terminal 1 — Backend (http://localhost:3000)
npm run dev:backend

# Terminal 2 — Frontend (http://localhost:3001)
npm run dev:frontend
```

Swagger docs: http://localhost:3000/api/docs

---

## 7. `packages/*` — Workspace Linking & Build Order

`packages/` holds shared code and testing utilities. Not all six directories under `packages/` are the same kind of thing — verified against each directory's own `package.json` (or lack of one):

| Package | npm workspace member? | What it is | Consumed by |
|---|---|---|---|
| `packages/types` | **Yes** (listed in root `package.json` → `workspaces`) | Shared TypeScript types (`@brain-storm/types`) | `apps/frontend`, `apps/backend` (both declare `"@brain-storm/types": "*"`), `packages/mobile-app` |
| `packages/mobile` | **Yes** | Shared mobile utilities (secure storage, biometrics, network/device helpers) — `@brain-storm/mobile` | `packages/mobile-app` |
| `packages/sdk` | No | Generated TypeScript client SDK (`@brain-storm/sdk`), built **from** `apps/backend`'s OpenAPI spec, not hand-written | External consumers of the API; not currently imported by `apps/frontend` or `apps/backend` themselves |
| `packages/mobile-app` | No — **not listed** in root `workspaces`, despite depending on `@brain-storm/mobile` and `@brain-storm/types` | The Expo/React Native mobile app | End users (via Expo) |
| `packages/api` | N/A — has no `package.json` at all | k6 load-testing scenarios/config for `apps/backend` (`packages/api/load/`) | CI / manual load testing, not linked as a library |
| `packages/app` | N/A — has no `package.json` at all | Visual regression, accessibility (a11y), and E2E testing assets for `apps/frontend` (`packages/app/visual/`, `packages/app/e2e/`), plus a small shared `transactions.ts` lib under `packages/app/src/` | CI / manual test suites, not linked as a library |

### `packages/types` and `packages/mobile` (real workspace members)

Because these two are declared in the root `package.json`'s `workspaces` array, a single root-level `npm install` symlinks them into `node_modules/@brain-storm/types` and `node_modules/@brain-storm/mobile` automatically — no separate install step is needed, and no build step is required before `npm run dev:backend` / `npm run dev:frontend` for local development (`ts-node`/webpack resolve the workspace source directly). If you only need the compiled output (e.g. for a production build or to `tsc --noEmit` against it in isolation):

```bash
npm run build --workspace=packages/types
```

`packages/types` has no dependency on any other workspace package, so it has no required build-before ordering relative to `packages/mobile`. Both are leaf dependencies of `apps/frontend` / `apps/backend` (`types`) and `packages/mobile-app` (`mobile`, `types`) — build/lint the leaf packages first only if you've hit a stale-types error; otherwise the root `npm install` + dev servers handle it.

### `packages/sdk` (generated, not a workspace member)

`packages/sdk` is intentionally **not** wired into the npm workspace graph — it's a build *output*, regenerated from the backend's live OpenAPI spec, not a package other workspaces import at dev time. To regenerate and build it locally:

```bash
./scripts/generate-sdk.sh          # builds apps/backend, exports openapi.json, copies it into packages/sdk/
cd packages/sdk && npm install && npm run build
```

`scripts/generate-sdk.sh` requires `apps/backend` to build and boot successfully (same DB/env requirements as `make export-openapi` — see [docs/api/README.md](./api/README.md#regenerating-the-full-openapi-spec)).

### `packages/mobile-app` (Expo app — known workspace-linking gap)

`packages/mobile-app/package.json` declares `"@brain-storm/mobile": "*"` and `"@brain-storm/types": "*"`, but **`packages/mobile-app` itself is absent from the root `package.json`'s `workspaces` array** (only `packages/types`, `packages/mobile`, `apps/frontend`, and `apps/backend` are listed). Since neither `@brain-storm/mobile` nor `@brain-storm/types` is published to a registry, running `npm install` from inside `packages/mobile-app` on a clean checkout will fail to resolve those two dependencies — there is no root `node_modules/@brain-storm/mobile-app` symlink and no registry fallback.

Until this is fixed upstream, work around it one of two ways:

- **Recommended:** run `npm install` from the **repo root** after temporarily adding `"packages/mobile-app"` to the root `workspaces` array — this lets npm's workspace resolver symlink `@brain-storm/mobile`/`@brain-storm/types` in for you, matching how `packages/types`/`packages/mobile` already work.
- **Alternative:** from the repo root, `npm link ./packages/mobile ./packages/types` into `packages/mobile-app/node_modules` manually.

Once dependencies resolve, run the app with:

```bash
cd packages/mobile-app
npm run start   # or: npm run android / npm run ios / npm run web
```

### `packages/api` and `packages/app` (test assets, not libraries)

These two do not have a `package.json` and are not consumed via `import`/`require` by any app — they're test suites that target the running apps:

```bash
# k6 load tests against apps/backend (requires the k6 CLI — see packages/api/load/README.md)
npm run start:dev --workspace=apps/backend   # in one terminal
k6 run packages/api/load/scenarios/search-discovery.js   # in another

# Visual regression / accessibility (a11y) tests against apps/frontend
# (see packages/app/visual/README.md and packages/app/e2e/a11y/README.md)
```

## Makefile Shortcuts

```bash
make setup   # install deps + build contracts
make dev     # start backend & frontend concurrently
make test    # run all tests
make build   # production build
make lint    # lint all workspaces
make clean   # remove build artifacts
```

---

## Automated Setup Script

For a fully automated first-time setup:

```bash
./scripts/setup.sh
```

This script checks prerequisites, copies `.env`, installs dependencies, builds contracts, and starts Docker services.

---

## Troubleshooting

### `Error: connect ECONNREFUSED 127.0.0.1:5432` (Database)
- Check PostgreSQL is running: `docker ps` or `pg_isready`
- Verify `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` in `.env`
- If using Docker: `docker compose up -d postgres`

### `Error: connect ECONNREFUSED 127.0.0.1:6379` (Redis)
- Check Redis is running: `docker ps` or `redis-cli ping`
- If using Docker: `docker compose up -d redis`
- Verify `REDIS_HOST` and `REDIS_PORT` in `.env`

### `Account not found` (Stellar)
- Your testnet account needs funding. Run:
  ```bash
  curl "https://friendbot.stellar.org?addr=<YOUR_PUBLIC_KEY>"
  ```

### `error[E0463]: can't find crate for wasm32`
- Run: `rustup target add wasm32-unknown-unknown`

### `Port 3000 / 3001 already in use`
- Find and kill the process: `lsof -ti:3000 | xargs kill -9`
- Or change `PORT` in `.env`

### `nest: command not found`
- Run `npm install` from the repo root first.
- Or use: `npx nest start --watch` inside `apps/backend`

### `JWT_SECRET is not defined`
- Ensure `.env` exists and contains `JWT_SECRET`.
- Generate one: `openssl rand -hex 32`

### Contract deployment fails with `insufficient funds`
- Re-fund your testnet account via Friendbot (see step 3 above).

### `cargo audit` fails in CI
- Run `cargo update` to refresh `Cargo.lock`, then re-run.

### `npm install` inside `packages/mobile-app` fails to resolve `@brain-storm/mobile` / `@brain-storm/types`
- Expected — `packages/mobile-app` is not currently listed in the root `package.json`'s `workspaces` array, so npm has no local source for those two packages. See the "`packages/mobile-app` (Expo app — known workspace-linking gap)" section above for the workaround.
