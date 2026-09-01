# On-Call Routing & Escalation Policy

Brain-Storm uses **PagerDuty** for on-call paging and **Slack** for team-wide alert visibility.

---

## Alert Routing Summary

```
Prometheus ──evaluates──► Alertmanager ──routes──►
  ├── severity=critical + oncall=true  → PagerDuty (page on-call) + #platform-oncall
  ├── severity=critical                → #alerts-critical (Slack)
  ├── team=contracts + critical        → #contracts-alerts
  ├── Queue.* / Indexer.*              → #platform-oncall (Slack)
  ├── DeploymentFailed                 → #deployments
  ├── Blackbox.*                       → #uptime
  └── default                          → #alerts
```

## Alert Labels That Trigger Paging

An alert pages on-call when it carries **both**:

- `severity: critical`
- `oncall: "true"`

Alerts without `oncall: "true"` post to Slack only.

## PagerDuty Configuration

| Setting           | Value                       |
| ----------------- | --------------------------- |
| Integration type  | Events API v2               |
| Env variable      | `PAGERDUTY_INTEGRATION_KEY` |
| Service           | `brain-storm-platform`      |
| Escalation policy | `Brain-Storm On-Call`       |

Set `PAGERDUTY_INTEGRATION_KEY` in the alertmanager deployment secret.

## Escalation Tiers

| Tier                    | Condition                    | Contacts                              |
| ----------------------- | ---------------------------- | ------------------------------------- |
| L1 — Primary on-call    | Alert fires                  | On-call engineer (PagerDuty rotation) |
| L2 — Secondary on-call  | No ack after 15 min          | Backup engineer                       |
| L3 — Engineering Lead   | No ack after 30 min          | Lead + L1 via PagerDuty               |
| L4 — Incident Commander | P0/P1 or > 60 min unresolved | Engineering manager via phone         |

## Slack Channels

| Channel             | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `#platform-oncall`  | Queue, indexer, real-time platform alerts |
| `#alerts-critical`  | All critical severity alerts              |
| `#alerts`           | All other (warning/info) alerts           |
| `#contracts-alerts` | Soroban contract failures                 |
| `#deployments`      | Deploy success/failure notifications      |
| `#uptime`           | Blackbox/uptime probe results             |
| `#incidents`        | Incident coordination thread              |

## Testing Alert Routing

To verify routing without a real incident, set the synthetic metric in staging:

```bash
# From a Prometheus-scraped service in staging, expose:
# brain_storm_test_incident_active{env="staging"} 1
#
# Or push directly via Pushgateway:
echo 'brain_storm_test_incident_active{env="staging"} 1' | \
  curl --data-binary @- http://pushgateway:9091/metrics/job/test
```

The `SimulatedIncidentTest` alert will fire after 1 minute and should:

1. Page the on-call engineer via PagerDuty.
2. Post to `#platform-oncall` on Slack.
3. Post to `#alerts-critical` on Slack.

After verifying, reset the metric to `0`.

## Runbooks

All alerts link to the incident runbook:
**https://github.com/BrainTease/Brain-Storm/blob/main/docs/incident-runbook.md**

Per-alert runbook anchors:

- Queue backlog → `#queue-backlog`
- Indexer lag → `#indexer-lag`
- High error rate → `#high-error-rate`
- High latency → `#high-response-latency`
- Backend down → `#backend-down`
- Database → `#database-issues`
- Contracts → `#contract-failures`
