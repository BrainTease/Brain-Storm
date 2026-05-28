#!/usr/bin/env bash
# Contract event monitor — streams Soroban events from all deployed contracts
# and exposes Prometheus metrics on port 9101.
set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"
CONTRACTS_JSON="${CONTRACTS_JSON:-scripts/deployed-contracts.json}"
METRICS_PORT="${METRICS_PORT:-9101}"
POLL_INTERVAL="${POLL_INTERVAL:-15}"

# Temporary files
METRICS_FILE="/tmp/contract_metrics.prom"
CURSOR_FILE="/tmp/contract_event_cursor"

# ── Helpers ──────────────────────────────────────────────────────────────────

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >&2; }

require() {
  for cmd in "$@"; do
    command -v "$cmd" >/dev/null || { log "Missing required command: $cmd"; exit 1; }
  done
}

# Write a metrics snapshot to the temp file (atomic swap via tmp)
write_metrics() {
  local tmp; tmp=$(mktemp)
  cat > "$tmp" <<EOF
# HELP contract_events_total Total number of events emitted per contract and event type.
# TYPE contract_events_total counter
$(cat "${METRICS_FILE}.events" 2>/dev/null)

# HELP contract_transactions_total Total transactions submitted per contract.
# TYPE contract_transactions_total counter
$(cat "${METRICS_FILE}.txns" 2>/dev/null)

# HELP contract_transaction_errors_total Total failed transactions per contract.
# TYPE contract_transaction_errors_total counter
$(cat "${METRICS_FILE}.errors" 2>/dev/null)

# HELP contract_last_event_timestamp Unix timestamp of the last event received per contract.
# TYPE contract_last_event_timestamp gauge
$(cat "${METRICS_FILE}.timestamps" 2>/dev/null)
EOF
  mv "$tmp" "$METRICS_FILE"
}

# Serve metrics over HTTP on $METRICS_PORT using a simple while loop
serve_metrics() {
  log "Serving Prometheus metrics on :${METRICS_PORT}/metrics"
  while true; do
    { echo -e "HTTP/1.1 200 OK\r\nContent-Type: text/plain; version=0.0.4\r\n\r\n$(cat "$METRICS_FILE" 2>/dev/null)"; } \
      | nc -l -p "$METRICS_PORT" -q 1 2>/dev/null || true
  done
}

# ── Event polling ─────────────────────────────────────────────────────────────

poll_contract_events() {
  local contract_id="$1"
  local contract_name="$2"
  local cursor="${3:-0}"

  local events
  events=$(stellar events \
    --id "$contract_id" \
    --network "$NETWORK" \
    --start-ledger "$cursor" \
    --output json 2>/dev/null) || { log "Failed to fetch events for $contract_name"; return 1; }

  local count; count=$(echo "$events" | jq 'length' 2>/dev/null || echo 0)
  [ "$count" -eq 0 ] && return 0

  # Parse and accumulate event metrics
  while IFS= read -r event; do
    local event_type; event_type=$(echo "$event" | jq -r '.topic[1] // "unknown"')
    local ledger; ledger=$(echo "$event" | jq -r '.ledger // 0')

    # Increment counter
    local key="contract_events_total{contract=\"${contract_name}\",event=\"${event_type}\"}"
    local current; current=$(grep -oP "(?<=${key} )\d+" "${METRICS_FILE}.events" 2>/dev/null || echo 0)
    grep -v "$key" "${METRICS_FILE}.events" 2>/dev/null > "${METRICS_FILE}.events.tmp" || true
    echo "$key $((current + 1))" >> "${METRICS_FILE}.events.tmp"
    mv "${METRICS_FILE}.events.tmp" "${METRICS_FILE}.events"

    # Update last-seen timestamp
    {
      grep -v "contract=\"${contract_name}\"" "${METRICS_FILE}.timestamps" 2>/dev/null || true
      echo "contract_last_event_timestamp{contract=\"${contract_name}\"} $(date +%s)"
    } > "${METRICS_FILE}.timestamps.tmp"
    mv "${METRICS_FILE}.timestamps.tmp" "${METRICS_FILE}.timestamps"

    # Advance cursor
    echo "$ledger" > "${CURSOR_FILE}.${contract_name}"
  done < <(echo "$events" | jq -c '.[]')

  log "$contract_name: processed $count events"
}

# ── Main ──────────────────────────────────────────────────────────────────────

require stellar jq nc

# Load contract IDs from deployed-contracts.json
if [ ! -f "$CONTRACTS_JSON" ]; then
  log "Contract registry not found: $CONTRACTS_JSON"
  exit 1
fi

declare -A CONTRACTS
while IFS="=" read -r name id; do
  CONTRACTS["$name"]="$id"
done < <(jq -r ".\"${NETWORK}\" | to_entries[] | \"\(.key)=\(.value)\"" "$CONTRACTS_JSON")

if [ "${#CONTRACTS[@]}" -eq 0 ]; then
  log "No contracts found for network: $NETWORK"
  exit 1
fi

log "Monitoring ${#CONTRACTS[@]} contracts on $NETWORK: ${!CONTRACTS[*]}"

# Initialize metric files
for f in events txns errors timestamps; do
  touch "${METRICS_FILE}.${f}"
done
write_metrics

# Start metrics HTTP server in background
serve_metrics &
METRICS_PID=$!
trap 'kill $METRICS_PID 2>/dev/null; exit 0' SIGINT SIGTERM

# Event polling loop
while true; do
  for name in "${!CONTRACTS[@]}"; do
    id="${CONTRACTS[$name]}"
    cursor_file="${CURSOR_FILE}.${name}"
    cursor=$(cat "$cursor_file" 2>/dev/null || echo 0)

    poll_contract_events "$id" "$name" "$cursor" || true
  done

  write_metrics
  sleep "$POLL_INTERVAL"
done
