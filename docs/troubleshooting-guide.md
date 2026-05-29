# Troubleshooting Guide

Common issues and solutions for developers and operators running Brain-Storm.

---

## Setup Errors

### `Error: connect ECONNREFUSED 127.0.0.1:5432`

PostgreSQL is not running or the connection details are wrong.

**Fix:**
```bash
docker compose up -d postgres

# Verify .env values
DATABASE_HOST=localhost   # use 'postgres' inside Docker
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=brain-storm
```

### `Error: connect ECONNREFUSED 127.0.0.1:6379`

Redis is not running.

**Fix:**
```bash
docker compose up -d redis
redis-cli ping   # should return PONG
```

### `JWT_SECRET is not defined`

The `.env` file is missing or incomplete.

**Fix:**
```bash
cp .env.example .env
openssl rand -hex 32   # paste result as JWT_SECRET in .env
```

### `nest: command not found`

`node_modules` is missing.

**Fix:**
```bash
npm install
```

### `Port 3000 already in use`

**Fix:**
```bash
lsof -ti:3000 | xargs kill -9
```

---

## Stellar Network Connectivity

### `Account not found` / `HostError: Error(Value, Missing)`

The Stellar account has not been funded.

**Fix (testnet):**
```bash
curl "https://friendbot.stellar.org?addr=<YOUR_PUBLIC_KEY>"
# or
./scripts/fund-testnet.sh
```

### Horizon or Soroban RPC unreachable

The backend polls network health every 60 seconds. Check current status:

```
GET /v1/health
```

- If `horizon` or `soroban` shows `"down"`, check [status.stellar.org](https://status.stellar.org).
- Verify `SOROBAN_RPC_URL` in `.env` (default: `https://soroban-testnet.stellar.org`).

### `tx_bad_seq` — transaction sequence mismatch

Retry the operation. The SDK re-fetches the latest sequence number on the next `getAccount()` call.

### `insufficient funds` during contract deployment

```bash
curl "https://friendbot.stellar.org?addr=$(stellar keys address dev-account)"
```

---

## Database Migration Problems

### Migrations not applied on startup

In production (`NODE_ENV=production`), `synchronize` is disabled. Run migrations explicitly:

```bash
cd apps/backend && npm run typeorm:run
```

### `relation already exists`

A partial migration left the schema inconsistent.

**Fix:**
```bash
npm run typeorm:revert   # roll back last migration
npm run typeorm:run      # re-apply
```

### `column does not exist`

Code references a column that hasn't been migrated yet.

**Fix:**
```bash
npm run typeorm:run
```

### Generating a new migration after entity changes

```bash
cd apps/backend
npm run typeorm:generate -- src/migrations/DescriptiveName
npm run typeorm:run
```

---

## Contract Deployment Failures

### `can't find crate for wasm32`

```bash
rustup target add wasm32-unknown-unknown
```

### `cargo build` fails with dependency errors

```bash
cargo update && ./scripts/build.sh
```

### `Already initialized` panic

`initialize()` is a one-time operation. Deploy a new contract instance and update the address in `.env` and `scripts/deployed-contracts.json`.

### `Unauthorized: must be student or admin`

The backend signer (`STELLAR_SECRET_KEY`) does not match the admin stored in the Analytics contract. Re-deploy or re-initialize the contract with the correct admin address.

---

## Performance Troubleshooting

### Slow API responses

1. Enable PostgreSQL slow query logging:
   ```sql
   SET log_min_duration_statement = 500;
   ```
2. Confirm Redis is running — if it's down, every leaderboard request triggers one Stellar RPC call per user.
3. Check Stellar RPC latency via `GET /v1/health`. High latency directly impacts progress recording and credential issuance.

### Leaderboard endpoint is slow

The leaderboard caches results in Redis for 5 minutes (`leaderboard:top50`). If the cache is cold or Redis is unavailable, the endpoint fetches BST balances for every user with a wallet.

**Fix:**
```bash
redis-cli ping          # confirm Redis is reachable
redis-cli ttl leaderboard:top50   # check remaining cache TTL
```

### High memory or CPU in backend

Use the Prometheus `/metrics` endpoint and the Grafana dashboards in `infra/monitoring/` to identify trends. Check for unclosed DB connections or WebSocket clients that failed to disconnect.

---

## API & Authentication Issues

### `401 Unauthorized` on protected routes

The JWT token is missing, expired, or invalid.

**Fix:**
```bash
# Verify token in Authorization header
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/v1/users/me

# Check token expiry
jwt decode <TOKEN>

# Refresh token if expired
curl -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<REFRESH_TOKEN>"}'
```

### `403 Forbidden` — insufficient permissions

The user's role does not allow the operation.

**Fix:**
- Verify user role: `GET /v1/users/me` → check `role` field.
- Ensure the route guard matches the user's role (e.g. `@Roles('admin')`).

### `429 Too Many Requests`

Rate limiting is active.

**Fix:**
- Wait for the `Retry-After` header duration.
- Check rate limit config in `AppModule` — default is 100 requests per 60 seconds.
- For sensitive endpoints (e.g. credential minting), the limit is tighter (3 per 60 seconds).

### `400 Bad Request` — validation error

Request body or query parameters are invalid.

**Fix:**
- Check the error message in the response body.
- Validate against the Swagger schema: `GET /api/docs`.
- Ensure all required fields are present and have the correct type.

---

## Stellar & Blockchain Issues

### `Insufficient funds` when minting credentials

The backend's Stellar account does not have enough XLM to pay transaction fees.

**Fix (testnet):**
```bash
./scripts/fund-testnet.sh
```

**Fix (mainnet):**
- Deposit XLM to the account specified in `STELLAR_SECRET_KEY`.
- Verify balance: `GET /v1/stellar/balance/<PUBLIC_KEY>`

### `Credential issuance failed` — contract error

The Analytics or Token contract rejected the transaction.

**Fix:**
1. Check backend logs for the contract error message.
2. Verify the contract is initialized:
   ```bash
   stellar contract invoke --id <CONTRACT_ID> --fn get_admin
   ```
3. Verify the backend signer matches the contract admin:
   ```bash
   stellar keys address $(echo $STELLAR_SECRET_KEY | stellar keys import --stdin)
   ```
4. If mismatch, re-initialize the contract with the correct admin.

### `Stellar account not found`

The account has not been funded on the network.

**Fix (testnet):**
```bash
curl "https://friendbot.stellar.org?addr=<PUBLIC_KEY>"
```

**Fix (mainnet):**
- Deposit at least 2 XLM to the account.
- Wait for the transaction to be confirmed (~5 seconds).

---

## Frontend Issues

### `CORS error` when calling backend API

The backend is not allowing requests from the frontend origin.

**Fix:**
1. Verify `NEXT_PUBLIC_API_URL` in `.env.local` matches the backend URL.
2. Check backend CORS config in `AppModule`:
   ```typescript
   app.enableCors({
     origin: process.env.FRONTEND_URL,
     credentials: true,
   });
   ```
3. Ensure the frontend origin is whitelisted.

### `Blank page` or `500 error` on load

The frontend failed to build or hydrate.

**Fix:**
```bash
npm run build:frontend
npm run dev:frontend

# Check browser console for errors
# Check Next.js server logs for build errors
```

### `Wallet connection fails`

The Stellar wallet extension is not installed or not responding.

**Fix:**
1. Install [Stellar Expert Wallet](https://stellar.expert/wallet) or [Freighter](https://www.freighter.app/).
2. Ensure the wallet is unlocked.
3. Check browser console for wallet errors.
4. Try a different wallet extension.

---

## Debugging Procedures

### Enable Debug Logging

```bash
# Backend
DEBUG=brain-storm:* npm run dev:backend

# Frontend
DEBUG=* npm run dev:frontend
```

### Inspect Network Requests

Use browser DevTools (F12) → Network tab:
- Check request/response headers.
- Verify status codes (200, 400, 401, 500).
- Inspect JSON payloads.

### Database Debugging

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d brain-storm

# Check recent queries
SELECT query, calls, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;

# Monitor active connections
SELECT pid, usename, query FROM pg_stat_activity;
```

### Contract Debugging

```bash
# Simulate a contract call (no state change)
stellar contract invoke --id <CONTRACT_ID> --fn get_progress \
  --arg <STUDENT_ADDRESS> --arg <COURSE_ID>

# Check contract state
stellar contract invoke --id <CONTRACT_ID> --fn get_admin
```

### Log Aggregation

Logs are written to:
- **Backend:** `apps/backend/logs/` (if file transport is enabled)
- **Frontend:** Browser console (F12)
- **Docker:** `docker compose logs -f backend`

---

## FAQ

### Q: How do I reset my local database?

```bash
docker compose down -v postgres
docker compose up -d postgres
npm run typeorm:run
```

### Q: How do I test a contract change locally?

```bash
./scripts/build.sh
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/analytics.wasm
# Update CONTRACT_ID in .env
npm run dev:backend
```

### Q: How do I check if a user has completed a course?

```bash
curl http://localhost:3000/v1/users/<USER_ID>/progress/<COURSE_ID>
```

### Q: How do I manually issue a credential?

```bash
curl -X POST http://localhost:3000/v1/credentials/issue \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "<USER_ID>", "courseId": "<COURSE_ID>"}'
```

### Q: How do I view the Swagger API docs?

```
http://localhost:3000/api/docs
```

### Q: How do I check the health of all services?

```bash
curl http://localhost:3000/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "up",
  "redis": "up",
  "horizon": "up",
  "soroban": "up"
}
```

---

## Support Escalation

### Level 1: Self-Service

1. Check this troubleshooting guide.
2. Search [GitHub Issues](https://github.com/BrainTease/Brain-Storm/issues).
3. Check [Stellar Discord](https://discord.gg/stellardev) for Stellar-specific issues.

### Level 2: Community Support

1. Open a [GitHub Discussion](https://github.com/BrainTease/Brain-Storm/discussions).
2. Provide:
   - Steps to reproduce
   - Error message and logs
   - Environment (OS, Node version, etc.)
   - Screenshots if applicable

### Level 3: Bug Report

If the issue is a bug, open a [GitHub Issue](https://github.com/BrainTease/Brain-Storm/issues/new) with:
- Title: Clear, concise description
- Description: Steps to reproduce, expected vs. actual behavior
- Logs: Full error stack trace
- Environment: OS, versions, configuration

### Level 4: Security Issue

Do **not** open a public issue. Email [security@brainstorm.dev](mailto:security@brainstorm.dev) with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
