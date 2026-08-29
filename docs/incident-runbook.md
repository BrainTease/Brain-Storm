# Incident Runbook

Actionable playbooks for on-call engineers responding to Brain-Storm alerts.

**On-call rotation:** Managed in PagerDuty — see [On-Call Escalation](#on-call-escalation-policy).

---

## Table of Contents

1. [On-Call Escalation Policy](#on-call-escalation-policy)
2. [Alert Severity Definitions](#alert-severity-definitions)
3. [Queue Backlog](#queue-backlog)
4. [Indexer Lag](#indexer-lag)
5. [High Error Rate](#high-error-rate)
6. [High Response Latency](#high-response-latency)
7. [Backend Down](#backend-down)
8. [Database Issues](#database-issues)
9. [Contract Failures](#contract-failures)

---

## On-Call Escalation Policy

| Tier                    | Who                 | When                              | Channel                              |
| ----------------------- | ------------------- | --------------------------------- | ------------------------------------ |
| L1 (Primary)            | On-call engineer    | Immediate (0 min)                 | PagerDuty → Slack `#platform-oncall` |
| L2 (Secondary)          | On-call backup      | No acknowledgement after 15 min   | PagerDuty escalation                 |
| L3 (Engineering Lead)   | Engineering lead    | No acknowledgement after 30 min   | PagerDuty + phone                    |
| L4 (Incident Commander) | Engineering manager | P0 declared or >60 min unresolved | Direct contact                       |

### Declaring an Incident

1. Post in `#incidents`: `🚨 INCIDENT DECLARED: <summary> | Severity: P<N> | IC: @you`
2. Create a Slack canvas / incident doc.
3. Loop in stakeholders for P0/P1.
4. Resolve via PagerDuty and post a post-mortem within 48h (P0/P1).

### Severity Levels

| Level | Criteria                                  | Response Time |
| ----- | ----------------------------------------- | ------------- |
| P0    | Total service outage, data loss risk      | Immediate     |
| P1    | Major feature broken, >10% users impacted | <15 min       |
| P2    | Degraded performance, partial outage      | <1 h          |
| P3    | Minor issue, workaround available         | <4 h          |

---

## Alert Severity Definitions

| Prometheus Severity | Meaning                                    |
| ------------------- | ------------------------------------------ |
| `critical`          | Pages on-call immediately via PagerDuty    |
| `warning`           | Posts to `#platform-oncall` Slack; no page |
| `info`              | Informational; goes to `#alerts` only      |

---

## Queue Backlog

**Alerts:** `QueueBacklogHigh`, `QueueBacklogCritical`, `QueueFailedJobsHigh`

### Symptoms

- Bull job queues accumulating waiting jobs
- Email notifications delayed
- Credential issuance or token reward processing delayed

### Diagnosis

```bash
# Check Redis connection
redis-cli -h $REDIS_HOST ping

# Check queue depths via Bull Board (if enabled)
curl http://localhost:3000/admin/queues

# Check worker pod status (Kubernetes)
kubectl get pods -n brain-storm -l app=worker

# View recent failed jobs (Redis)
redis-cli -h $REDIS_HOST llen bull:<queue-name>:failed
```

### Resolution Steps

1. **Verify workers are running** — check pod/process status.
2. **Check Redis health** — if Redis is down, restart it; workers will reconnect.
3. **Inspect failed jobs** — use Bull Board or Redis CLI to inspect failure reasons.
4. **Scale workers** if queue depth is growing faster than draining:
   ```bash
   kubectl scale deployment brain-storm-worker --replicas=4 -n brain-storm
   ```
5. **Retry failed jobs** via Bull Board or:
   ```bash
   # Retry all failed jobs in a queue
   redis-cli -h $REDIS_HOST eval "..." 0
   ```
6. Alert resolves automatically once queue depth drops below threshold.

---

## Indexer Lag

**Alerts:** `IndexerLagHigh`, `IndexerLagCritical`, `IndexerStalled`

### Symptoms

- Stellar credential transactions not reflected in the platform
- `stellar_indexer_lag_blocks` metric elevated
- Users see stale on-chain progress

### Diagnosis

```bash
# Check indexer service logs
kubectl logs -n brain-storm -l app=stellar-indexer --tail=100

# Check current Stellar network ledger vs. indexed ledger
curl https://horizon.stellar.org/ledgers?order=desc&limit=1
# Compare to: GET /v1/stellar/indexer-status

# Verify Horizon connectivity
curl $STELLAR_HORIZON_URL/health
```

### Resolution Steps

1. **Check Horizon endpoint** — if Horizon is unreachable, the indexer will stall.
2. **Restart indexer** if it has crashed:
   ```bash
   kubectl rollout restart deployment/stellar-indexer -n brain-storm
   ```
3. **Check rate limits** — if using a public Horizon endpoint, consider switching to a dedicated node.
4. **Fast-forward** if lag > 1000 blocks: allow the indexer to catch up; it will process at ~100 ledgers/s.
5. **Backfill** if events were missed during an outage — trigger manual backfill job:
   ```bash
   POST /v1/stellar/indexer/backfill
   Authorization: Bearer <admin-jwt>
   { "fromLedger": <start>, "toLedger": <end> }
   ```

---

## High Error Rate

**Alert:** `HighErrorRate`

### Diagnosis

```bash
# Tail recent error logs
kubectl logs -n brain-storm -l app=backend --tail=200 | grep '"level":"error"'

# Check Sentry for new exceptions
# https://sentry.io/organizations/brain-storm/issues/

# Check DB health
psql -h $DATABASE_HOST -U $DATABASE_USER -c "SELECT count(*) FROM pg_stat_activity WHERE state='active';"
```

### Resolution Steps

1. Check Sentry / logs for the root exception.
2. If a bad deploy: roll back via `kubectl rollout undo deployment/backend`.
3. If DB-related: see [Database Issues](#database-issues).
4. If third-party API: verify Stellar Horizon / SMTP uptime.

---

## High Response Latency

**Alert:** `HighResponseLatency`

### Diagnosis

```bash
# Check slow query log
psql -h $DATABASE_HOST -U $DATABASE_USER -c "
  SELECT pid, now()-pg_stat_activity.query_start AS duration, query
  FROM pg_stat_activity
  WHERE state != 'idle' AND now()-query_start > interval '5 seconds'
  ORDER BY duration DESC;"

# Check Redis cache hit rate
redis-cli -h $REDIS_HOST INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

### Resolution Steps

1. Identify slow endpoints from Grafana `api-observability` dashboard.
2. Check for missing DB indexes or N+1 queries in logs.
3. If cache cold: Redis may have been restarted; latency will normalise as cache warms.
4. Scale backend replicas if under load:
   ```bash
   kubectl scale deployment backend --replicas=4 -n brain-storm
   ```

---

## Backend Down

**Alert:** `BackendDown`

### Resolution Steps

1. Check pod status: `kubectl get pods -n brain-storm -l app=backend`
2. Describe failing pod: `kubectl describe pod <pod-name> -n brain-storm`
3. Check logs: `kubectl logs <pod-name> -n brain-storm --previous`
4. Common causes: OOM kill (increase memory limits), failed DB migration, missing env var.
5. Rollback if recent deploy: `kubectl rollout undo deployment/backend -n brain-storm`

---

## Database Issues

**Alerts:** `DatabaseConnectionsHigh`, `DatabaseSlowQueries`

### High Connection Count

1. Check for connection leaks: look for idle connections > 5 min.
2. Restart backend replicas to reset connection pools:
   ```bash
   kubectl rollout restart deployment/backend -n brain-storm
   ```
3. Increase `max_connections` in RDS parameter group if legitimate traffic spike.
4. Enable PgBouncer if not already in use.

### Slow Queries

1. Identify query via `pg_stat_activity` (see above).
2. Run `EXPLAIN ANALYZE` on the slow query.
3. Add missing index or rewrite query.
4. `VACUUM ANALYZE <table>` if stats are stale.

---

## Contract Failures

**Alerts:** `ContractHighErrorRate`, `ContractEventSilence`, `ContractHighLatency`

### Diagnosis

```bash
# Check contract event monitor
kubectl logs -n brain-storm -l app=contract-monitor --tail=100

# Check Stellar transaction status
stellar-cli transactions list --network $STELLAR_NETWORK --limit 10
```

### Resolution Steps

1. Check if Stellar network is experiencing issues: https://status.stellar.org
2. Verify the issuer account has sufficient XLM for fees.
3. Check `STELLAR_SECRET_KEY` is valid and the account is funded:
   ```bash
   stellar-cli account show --address $STELLAR_PUBLIC_KEY --network $STELLAR_NETWORK
   ```
4. If contract upgraded recently, verify the new WASM hash is deployed correctly.
5. Escalate to Stellar Discord if network-wide issue: https://discord.gg/stellardev
